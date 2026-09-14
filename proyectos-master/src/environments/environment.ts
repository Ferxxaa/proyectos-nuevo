// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
  production: false,
  url: "http://trazas-nbi.com:1234/api/",
  // node: "http://localhost:1234/api/",
  node: "http://trazas-nbi.com:1234/api/",
  iva:0.19,
  boleta: 0.1075
};
