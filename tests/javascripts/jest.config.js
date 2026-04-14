module.exports = {
  "setupFilesAfterEnv": ['./support/setup.js'],
  "testEnvironment": "jsdom",
  "transform": {
    "^.+\\.(js|jsx)$": ["babel-jest", { "configFile": "./.babelrc" }]
  }
}
