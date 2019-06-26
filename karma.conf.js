const pkg = require('./package.json');

module.exports = function (config) {
    config.set({
        frameworks: ['mocha', 'expect'],
        basePath: '.',
        client: {
            mocha: {
                timeout : 6000
            }
        },
        files: [
            'node_modules/maptalks/dist/maptalks.js',
            'node_modules/@maptalks/gl/dist/maptalksgl.js',
            'dist/maptalks.wind-dev.js',
            'test/**/*.js',
            {
                pattern: 'test/data/**/*',
                included: false
            }
        ],
        proxies: {
            '/data/': '/base/test/data/'
        },
        preprocessors: {
        },
        browsers: ['Chrome'],
        reporters: ['mocha']
    });
};
