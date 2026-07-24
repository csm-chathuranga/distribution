const jwt = require('jsonwebtoken');
const { User, Role, Permission, RolePermission, UserPermission } = require('../models');

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { Branch } = require('../models');
    const user = await User.findByPk(decoded.id, {
      include: [
        {
          model: Role,
          include: [{ model: Permission, through: { attributes: [] } }],
        },
        { model: Permission, through: { attributes: ['granted'] } },
        { model: Branch, attributes: ['id', 'company_id'] },
      ],
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'User inactive or not found' });
    }

    // Build effective permission set
    const rolePerms = new Set(user.Role?.Permissions?.map((p) => p.code) || []);

    // Apply user-level overrides
    user.Permissions?.forEach((p) => {
      if (p.UserPermission.granted) rolePerms.add(p.code);
      else rolePerms.delete(p.code);
    });

    req.user = user;
    req.permissions = rolePerms;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
