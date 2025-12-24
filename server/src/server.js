const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = parseInt(process.env.PORT || '3000', 10);
const DATA_DIR = path.join(__dirname, '..', 'data');
const MUSIC_DIR = path.join(__dirname, '..', 'music');
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'cakal-radio-secret';

const usersPath = path.join(DATA_DIR, 'users.json');
const playlistsPath = path.join(DATA_DIR, 'playlists.json');

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(MUSIC_DIR)) {
    fs.mkdirSync(MUSIC_DIR, { recursive: true });
  }
  if (!fs.existsSync(usersPath)) {
    fs.writeFileSync(usersPath, '[]', 'utf-8');
  }
  if (!fs.existsSync(playlistsPath)) {
    fs.writeFileSync(playlistsPath, '[]', 'utf-8');
  }
}

function loadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to read JSON', filePath, error);
    return [];
  }
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password, stored) {
  const [salt, hashed] = stored.split(':');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hashed, 'hex'), Buffer.from(derivedKey, 'hex'));
}

function createToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(`${header}.${body}`).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
  } catch (error) {
    return null;
  }
}

function parseBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        req.connection.destroy();
      }
    });
    req.on('end', () => {
      try {
        const parsed = data ? JSON.parse(data) : {};
        resolve(parsed);
      } catch (error) {
        resolve({});
      }
    });
  });
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  });
  res.end(body);
}

function sendStream(res, status, headers, stream) {
  res.writeHead(status, {
    ...headers,
    'Access-Control-Allow-Origin': '*',
  });
  stream.pipe(res);
}

async function handleRegister(req, res) {
  const body = await parseBody(req);
  const { username, password } = body;
  if (!username || !password) {
    return sendJson(res, 400, { message: 'username and password are required' });
  }
  const users = loadJson(usersPath);
  if (users.find((u) => u.username === username)) {
    return sendJson(res, 409, { message: 'User already exists' });
  }
  const user = {
    id: crypto.randomUUID(),
    username,
    password: hashPassword(password),
  };
  users.push(user);
  saveJson(usersPath, users);
  return sendJson(res, 201, { id: user.id, username: user.username });
}

async function handleLogin(req, res) {
  const body = await parseBody(req);
  const { username, password } = body;
  if (!username || !password) {
    return sendJson(res, 400, { message: 'username and password are required' });
  }
  const users = loadJson(usersPath);
  const user = users.find((u) => u.username === username);
  if (!user || !verifyPassword(password, user.password)) {
    return sendJson(res, 401, { message: 'Invalid credentials' });
  }
  const token = createToken({ id: user.id, username: user.username });
  return sendJson(res, 200, { token, user: { id: user.id, username: user.username } });
}

function requireAuth(req, res, url) {
  const authHeader = req.headers['authorization'] || '';
  const tokenFromHeader = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const tokenFromQuery = url ? url.searchParams.get('token') : null;
  const token = tokenFromHeader || tokenFromQuery;
  const payload = verifyToken(token);
  if (!payload) {
    sendJson(res, 401, { message: 'Unauthorized' });
    return null;
  }
  return payload;
}

function listTracks() {
  const files = fs.existsSync(MUSIC_DIR) ? fs.readdirSync(MUSIC_DIR) : [];
  return files
    .filter((file) => !fs.lstatSync(path.join(MUSIC_DIR, file)).isDirectory())
    .map((file) => {
      const stats = fs.statSync(path.join(MUSIC_DIR, file));
      const title = path.parse(file).name;
      return {
        id: file,
        title,
        filename: file,
        size: stats.size,
      };
    });
}

function handleTracks(req, res) {
  const tracks = listTracks();
  return sendJson(res, 200, { tracks });
}

function handleStream(req, res, fileName) {
  const filePath = path.join(MUSIC_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    return sendJson(res, 404, { message: 'Track not found' });
  }
  const stat = fs.statSync(filePath);
  const range = req.headers.range;
  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
    const chunkSize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'audio/mpeg',
      'Access-Control-Allow-Origin': '*',
    });
    return file.pipe(res);
  }
  res.writeHead(200, {
    'Content-Length': stat.size,
    'Content-Type': 'audio/mpeg',
    'Access-Control-Allow-Origin': '*',
  });
  fs.createReadStream(filePath).pipe(res);
  return undefined;
}

function handlePlaylists(req, res, user) {
  const playlists = loadJson(playlistsPath).filter((p) => p.ownerId === user.id);
  return sendJson(res, 200, { playlists });
}

async function handleCreatePlaylist(req, res, user) {
  const body = await parseBody(req);
  const { name, trackIds = [] } = body;
  if (!name) {
    return sendJson(res, 400, { message: 'Playlist name is required' });
  }
  const playlists = loadJson(playlistsPath);
  const playlist = {
    id: crypto.randomUUID(),
    ownerId: user.id,
    name,
    trackIds,
    createdAt: new Date().toISOString(),
  };
  playlists.push(playlist);
  saveJson(playlistsPath, playlists);
  return sendJson(res, 201, { playlist });
}

async function handleUpdatePlaylist(req, res, user, playlistId) {
  const playlists = loadJson(playlistsPath);
  const playlist = playlists.find((p) => p.id === playlistId && p.ownerId === user.id);
  if (!playlist) {
    return sendJson(res, 404, { message: 'Playlist not found' });
  }
  const body = await parseBody(req);
  if (body.name) playlist.name = body.name;
  if (Array.isArray(body.trackIds)) playlist.trackIds = body.trackIds;
  saveJson(playlistsPath, playlists);
  return sendJson(res, 200, { playlist });
}

function handleDeletePlaylist(req, res, user, playlistId) {
  const playlists = loadJson(playlistsPath);
  const next = playlists.filter((p) => !(p.id === playlistId && p.ownerId === user.id));
  if (next.length === playlists.length) {
    return sendJson(res, 404, { message: 'Playlist not found' });
  }
  saveJson(playlistsPath, next);
  return sendJson(res, 204, {});
}

function handleDownload(res, fileName) {
  const filePath = path.join(MUSIC_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    return sendJson(res, 404, { message: 'Track not found' });
  }
  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${fileName}"`,
    'Content-Length': stat.size,
    'Access-Control-Allow-Origin': '*',
  });
  fs.createReadStream(filePath).pipe(res);
}

function notFound(res) {
  sendJson(res, 404, { message: 'Route not found' });
}

function methodNotAllowed(res) {
  sendJson(res, 405, { message: 'Method not allowed' });
}

function handleOptions(res) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  });
  res.end();
}

const server = http.createServer(async (req, res) => {
  ensureDirectories();
  if (!req.url) {
    return notFound(res);
  }

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname === '/api/auth/register' && req.method === 'POST') {
    return handleRegister(req, res);
  }

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    return handleLogin(req, res);
  }

  if (pathname === '/api/tracks') {
    const user = requireAuth(req, res, url);
    if (!user) return undefined;
    if (req.method === 'GET') return handleTracks(req, res);
    return methodNotAllowed(res);
  }

  if (pathname.startsWith('/api/tracks/') && pathname.endsWith('/stream')) {
    const user = requireAuth(req, res, url);
    if (!user) return undefined;
    const fileName = decodeURIComponent(pathname.replace('/api/tracks/', '').replace('/stream', ''));
    if (req.method === 'GET') return handleStream(req, res, fileName);
    return methodNotAllowed(res);
  }

  if (pathname.startsWith('/api/tracks/') && pathname.endsWith('/download')) {
    const user = requireAuth(req, res, url);
    if (!user) return undefined;
    const fileName = decodeURIComponent(pathname.replace('/api/tracks/', '').replace('/download', ''));
    if (req.method === 'GET') return handleDownload(res, fileName);
    return methodNotAllowed(res);
  }

  if (pathname === '/api/playlists') {
    const user = requireAuth(req, res, url);
    if (!user) return undefined;
    if (req.method === 'GET') return handlePlaylists(req, res, user);
    if (req.method === 'POST') return handleCreatePlaylist(req, res, user);
    return methodNotAllowed(res);
  }

  if (pathname.startsWith('/api/playlists/')) {
    const user = requireAuth(req, res, url);
    if (!user) return undefined;
    const playlistId = pathname.replace('/api/playlists/', '');
    if (req.method === 'PUT') return handleUpdatePlaylist(req, res, user, playlistId);
    if (req.method === 'DELETE') return handleDeletePlaylist(req, res, user, playlistId);
    return methodNotAllowed(res);
  }

  return notFound(res);
});

server.listen(PORT, HOST, () => {
  console.log(`Cakal Radyo API listening on http://${HOST}:${PORT}`);
  console.log(`Add your audio files to ${MUSIC_DIR}`);
});
