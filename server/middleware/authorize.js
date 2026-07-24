const authorize = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.permissions) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // super_admin bypasses all permission checks
    if (req.user.Role?.name === 'super_admin') return next();

    const hasAll = requiredPermissions.every((p) => req.permissions.has(p));
    if (!hasAll) {
      return res.status(403).json({
        message: 'Insufficient permissions',
        required: requiredPermissions,
      });
    }
    next();
  };
};

// Passes if the user has ANY ONE of the listed permissions
authorize.any = (...perms) => (req, res, next) => {
  if (!req.permissions) return res.status(403).json({ message: 'Forbidden' });
  if (req.user.Role?.name === 'super_admin') return next();
  if (perms.some((p) => req.permissions.has(p))) return next();
  return res.status(403).json({ message: 'Insufficient permissions', required: perms });
};

module.exports = authorize;
