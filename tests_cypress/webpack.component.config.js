const path = require("path");

module.exports = {
  mode: "development",
  resolve: {
    extensions: [".js", ".jsx"],
    // Resolve modules from the root node_modules so tiptap / react deps are found
    modules: [
      path.resolve(__dirname, "../node_modules"),
      "node_modules",
    ],
  },
  resolveLoader: {
    modules: [
      path.resolve(__dirname, "../node_modules"),
      "node_modules",
    ],
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              "@babel/preset-env",
              ["@babel/preset-react", { runtime: "automatic" }],
            ],
          },
        },
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(png|svg|jpg|gif|ico)$/,
        type: "asset/resource",
      },
    ],
  },
};
