const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    branch_id: DataTypes.INTEGER,
    role_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    email: { type: DataTypes.STRING(100), allowNull: false, unique: true, validate: { isEmail: true } },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    phone: DataTypes.STRING(20),
    employee_id: DataTypes.STRING(50),
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    last_login: DataTypes.DATE,
  }, {
    tableName: 'users',
    defaultScope: { attributes: { exclude: ['password_hash'] } },
    scopes: { withPassword: { attributes: {} } },
  });

  User.prototype.checkPassword = function (plain) {
    return bcrypt.compare(plain, this.password_hash);
  };

  User.beforeCreate(async (user) => {
    if (user.password_hash && !user.password_hash.startsWith('$2')) {
      user.password_hash = await bcrypt.hash(user.password_hash, parseInt(process.env.BCRYPT_ROUNDS) || 10);
    }
  });

  User.beforeUpdate(async (user) => {
    if (user.changed('password_hash') && user.password_hash && !user.password_hash.startsWith('$2')) {
      user.password_hash = await bcrypt.hash(user.password_hash, parseInt(process.env.BCRYPT_ROUNDS) || 10);
    }
  });

  return User;
};
