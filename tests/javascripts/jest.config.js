module.exports = {
  "setupFilesAfterEnv": ['./support/setup.js'],
  "testEnvironment": "jsdom",
  "transform": {
    "^.+/app/assets/javascripts/attachments/.+\\.js$": [
      "babel-jest",
      {
        "presets": [
          ["@babel/preset-env", { "targets": { "node": "current" } }],
          ["@babel/preset-react", { "runtime": "classic" }]
        ]
      }
    ]
  }
}
