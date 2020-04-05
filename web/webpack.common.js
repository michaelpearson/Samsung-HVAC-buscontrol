const merge = require('webpack-merge');
const common = require('./webpack.common.js');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = merge(common, {
    entry: './src/ts/index.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    output: {
        path: __dirname + '/../data'
    },
    devServer: {
        proxy: {
            '/ws': {
                target: 'ws://192.168.1.115:80',
                ws: true
            },
            '/set': {
                target: 'http://192.168.1.115:80'
            }
        }
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'ejs-compiled-loader!./src/index.ejs',
            inject: 'head'
        })
    ]
});