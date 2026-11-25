module.exports = {
  "setupFilesAfterEnv": ['./support/setup.js'],
  "testEnvironment": "jsdom",
  "transform": {
    "^.+/(?:app/assets/javascripts/attachments/.+|app/assets/javascripts/tiptap/utils/wordPaste|tests/javascripts/wordPaste\\.test)\\.js$": [
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
