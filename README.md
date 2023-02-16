## Install

```
yarn install # download packages

graph auth https://api.thegraph.com/deploy/ <AUTH KEY> # authenticate using the key in your The Graph account

yarn run codegen # Run this after every update to schema.graphql and subgraph.yaml to generate assets and interfaces.

yarn run deploy # deploy to The Graph hosted service, under your account

yarn run test # run tests with matchstick
```
