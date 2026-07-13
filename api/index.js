const { default: app } = require("../artifacts/api-server/dist-vercel/vercel.cjs");

module.exports = (req, res) => {
  return app(req, res);
};
