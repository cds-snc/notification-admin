# we need the version file to exist otherwise the app will blow up
make generate-version-file

npm install && npm run build
