const jwt = require('jsonwebtoken');
const { User, Role, Permission } = require('../models');

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_SECRET + '_refresh';

const signAccess = (user) =>
  jwt.sign({ id: user.id, role: user.role_id }, ACCESS_SECRET, { expiresIn: '1h' });

const signRefresh = (user) =>
  jwt.sign({ id: user.id, type: 'refresh' }, REFRESH_SECRET, { expiresIn: '7d' });

const userInclude = [{ model: Role, include: [Permission] }];

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.scope('withPassword').findOne({
      where: { email },
      include: userInclude,
    });

    if (!user || !user.is_active) return res.status(401).json({ message: 'Invalid credentials' });
    if (!(await user.checkPassword(password))) return res.status(401).json({ message: 'Invalid credentials' });

    await user.update({ last_login: new Date() });

    const token = signAccess(user);
    const refresh_token = signRefresh(user);
    const { password_hash, ...userData } = user.toJSON();

    res.json({ token, refresh_token, user: userData });
  } catch (err) { next(err); }
};

exports.refresh = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(401).json({ message: 'No refresh token provided' });

    let decoded;
    try {
      decoded = jwt.verify(refresh_token, REFRESH_SECRET);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    if (decoded.type !== 'refresh') return res.status(401).json({ message: 'Invalid token type' });

    const user = await User.findByPk(decoded.id, { include: userInclude });
    if (!user || !user.is_active) return res.status(401).json({ message: 'User not found or inactive' });

    const token = signAccess(user);
    const new_refresh_token = signRefresh(user);
    const { password_hash, ...userData } = user.toJSON();

    res.json({ token, refresh_token: new_refresh_token, user: userData });
  } catch (err) { next(err); }
};

exports.me = async (req, res) => {
  res.json({ user: req.user, permissions: [...req.permissions] });
};

exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await User.scope('withPassword').findByPk(req.user.id);
    if (!(await user.checkPassword(current_password))) {
      return res.status(400).json({ message: 'Current password incorrect' });
    }
    await user.update({ password_hash: new_password });
    res.json({ message: 'Password changed' });
  } catch (err) { next(err); }
};
