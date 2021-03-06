# API Supertest

API testing tool derived from [Supertest](https://github.com/tj/supertest) - thus the name.

This tool allows to specify api tests in a folder structure using yaml for
fast API tests.

*Note: I wrote this tool mostly to make the communication with my colleagues easier.*

# Installation

*Note: This tool requires [Node](http://nodejs.org/download) to be installed!*

## Local (per project)

```bash
$ npm i api-supertest --save
```

and then add the test case to the ```package.json```

```javascript
{
    ...
    "scripts": {
        "api": "api-supertest"
    }
    ...
}
```

Then you can run the api tests using

```bash
$ npm run api
```


## Global

```bash
$ npm i api-supertest -g
```

Now the command ```api-supertest``` should be available in your command line.
You can access the help for the command-line flags through `api-supertest --help`.

# Folder Structure

This test system expects that your tests are in the ```/spec``` folder. Typically it looks something like this.

```
/spec
   options.yml
   type.js
   /tests
       route.yml
```

## options.yml

Theoretically you should be able to set all spec using only the ```options.yml```.

Property | Content
-------  | -------
base     | The base url, if missing will be built using https, server and prefix
https    | If true then https will be used (default: false)
server   | Server base url (eg. github.com)
prefix   | Prefix prepended to all api calls (eg. /api)
defaults | (Object, optional) Additional configuration for tests. Will be used as fallback
output   | Output implementation. ```console``` or ```none``` is supported. (defaults to ```console``` in the command line and to ```none``` when used as a library)
tests    | A list of tests that should be run.
before   | A function will be called before all the tests are run (syntax: [!!js/function](https://github.com/nodeca/js-yaml#user-content-supported-yaml-types))
after    | A function will be called after all the tests are run (syntax: [!!js/function](https://github.com/nodeca/js-yaml#user-content-supported-yaml-types))
beforeEach | A function will be called before each test is run (syntax: [!!js/function](https://github.com/nodeca/js-yaml#user-content-supported-yaml-types))
afterEach | A function will be called before each test is run (syntax: [!!js/function](https://github.com/nodeca/js-yaml#user-content-supported-yaml-types))

Tests is a list of urls that will be tested for accuracy

Property | Content
-------- | -------
path     | Path to be loaded (eg. ```path: /test``` would result to ```http://github.com/api/test```)
priority | Optional number (default 1). Entries with higher priority will be executed first.
method   | Optional http method, will default to get
context  | (Object, optional) Data context to be used to resolve `${}` blocks (will be merged with the runtime context and during the derivision)
data     | Data to be passed to a post/put/head/push request
wait     | Wait a given amount milliseconds before executing the request
requestHeader | (Object, optional) A set of headers to be when requesting the resource (will be merged during derive)
responseHeader | (Object, optional) A set of headers to check the response against (will be merged during derive)
push, put, post, head | Shortcuts to define a request as (eg.) post & with the given data (eg. ```post: "foo=bar&baz=boz"``` is the same as ```method: post``` and ```data: "foo=bar&baz=boz"```)
username | Username to be used for basic auth
password | Password to be used for basic auth
get      | Adds a query string to the path. (replaces the query string if its already there). Add it without the leading "?": eg. ```foo=bar&baz=qux``` this will also set the method to ```get```.
json     | [Joi](https://github.com/hapijs/joi) based json validator to be used for validating files
result   | Result as a string to validate the content against. (Does not work in combination with ```json```). Can also be a [!!js/function](https://github.com/nodeca/js-yaml#user-content-supported-yaml-types) to perform your own tests.
maxRedirects | Number of redirects to follow. (default: none)
before    | A function will be called before this test is run (syntax: [!!js/function](https://github.com/nodeca/js-yaml#user-content-supported-yaml-types))
after     | A function will be called after this test is run (syntax: [!!js/function](https://github.com/nodeca/js-yaml#user-content-supported-yaml-types))

Test can also contain a (recursive!) ```derive``` statement that allows you to specify multiple tests in a faster fashion:

```yaml
tests:
    - path: /search
      derive:
          - post: q=hello
            json: !!type SEARCH_RESULT

          - method: get
            code: 404
```

This results in the same tests as:

```yaml
tests:
    - path: /search
      post: q=hello
      json: !!type SEARCH_RESULT

    - path: /search
      method: get
      code: 404
```

*Note: There are more options if you use it [as a library](#as-a-library).*

## Context Variables

It is possible to use context variables in the definitions. The simplest example would look like:

```yaml
tests:
  - path: ${my_var}
    context:
     my_var: /my_path
```

This, by itself, is not really useful but it can be helpful if you combine it with `after`, `json` and `priority`:

```yaml
tests: 
  - path: /user
    json: !!type USER
    priority: 2
    after: !!js/function
      function(item, global, cb) {
        global.context.user_id = item.json.id;
        cb();
      }
  - path: /avatar
    get: id=${user_id}

```

The example above loads the user first (because of the higher priority). After the data was found it stores the result id in the global context's `user_id` field. Using the new context variable it is possible to load the avatar for a user.

## Environment variables

In any yaml file you can use the `!!env` prefix to load an environment variable.

_options.yml_
```yaml
context:
  password: !!env TEST_PASSWORD
```

`api-supertest` comes with support for `.env` variables. If you pass the command-line option `--dotEnv=true` it will
load the `.env`-file in the current working directory.

## type.js

Yaml doesn't offer regular javascript functionality and [Joi](https://github.com/hapijs/joi) is a really comfortable json definition format. ```type.js``` offers you to define types to be used in yaml files using javascript. For example:

type.js
```javascript
var joi = require("joi")

module.exports = {
    MY_OBJECT: joi.object({
        id: joi.string().regexp(/^[A-Z]+$/),
        title: joi.string(),
        age: joi.date()
    })
}
```

Then you can refer to this new type ```MY_OBJECT``` in the yaml file.

options.js
```yaml
tests:
   - path: /foo
     json: !!type MY_OBJECT
```

## tests/*.yaml

Any yaml file that you put in the ```tests``` folder will be merged and added to ```options.yaml```'s ```tests``` property.

# As a library

You can also use ```api-supertest``` with ```JavaScript``` after installing it with ```npm i api-supertest --save``` in a [Node](http://nodejs.org) script:

```javascript
var test = require("api-supertest"),
    joi;

test({
    https: false,
    server: "github.com",
    prefix: "/api",
    tests: [
       {path: "/search", code: 404}
    ],
    output: require("api-supertest/output/console")
});
```

# Contribute!

Please, please contribute :smiley: I wrote this tool to be comfortable when communicating in the company but its far from perfect. Even though I took care when structuring it. Open a pull request to fix an [issue](https://github.com/ikkyotech/api-supertest/issues), add an issue. I will make sure to respond as fast as I can.
