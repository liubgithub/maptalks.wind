const pkg = require('./package.json');

module.exports = function (config) {
    config.set({
        frameworks: ['mocha', 'expect'],
        basePath: '.',
        client: {
            mocha: {
                timeout : 10000
            }
        },
        files: [
            'test/js/gltf-loader.js',
            'dist/mesh-simplify-dev.js',
            'test/**/*.js',
            {
                pattern: 'test/models/**/*',
                included: false
            }
        ],
        proxies: {
            '/models/': '/base/test/models/'
        },
        preprocessors: {
        },
        browsers: ['Chrome'],
        reporters: ['mocha']
    });
};
