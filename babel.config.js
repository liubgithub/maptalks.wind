module.exports = {
    'presets': [
        ['@babel/env', {
            'loose': true,
            'modules': false
        }]
    ],
    'plugins': [
    ],
    'ignore': [
        'dist/*.js',
        'test/js/*.js'
    ],
    'comments': false
};
