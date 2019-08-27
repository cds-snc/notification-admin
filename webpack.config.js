const path = require("path");
const webpack = require("webpack");

module.exports = {
  //mode: "production", //development
  mode: "production",
  entry: "./app/assets/javascripts/index.js",
  watch: true,
  output: {
    filename: "[name].min.js",
    path: path.resolve(__dirname, "app/assets/javascripts")
  },

  plugins: [new webpack.ProgressPlugin()],

  module: {
    rules: [
      {
        test: /.(js|jsx)$/,
        include: [path.resolve(__dirname, "app/assets/javascripts")],
        loader: "babel-loader",

        options: {
          plugins: ["syntax-dynamic-import"],

          presets: [
            [
              "@babel/preset-env",
              {
                modules: false
              }
            ]
          ]
        }
      }
    ]
  }
};
