module.exports = {
  async up(sequelize) {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id        INT AUTO_INCREMENT PRIMARY KEY,
        user_id   INT NULL,
        role_name VARCHAR(50) NULL,
        type      VARCHAR(60) NOT NULL,
        title     VARCHAR(200) NOT NULL,
        body      TEXT NULL,
        link      VARCHAR(300) NULL,
        data      TEXT NULL,
        is_read   TINYINT(1) NOT NULL DEFAULT 0,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
  },
};
