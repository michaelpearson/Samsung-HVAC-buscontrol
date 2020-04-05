const merge = require('webpack-merge');
const common = require('./webpack.common.js');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

class InlineJsHtmlPlugin {
    getInlinedTag(publicPath, assets, tag) {
        if (tag.tagName !== 'script' || !(tag.attributes && tag.attributes.src)) {
            return tag;
        }
        if (!tag.attributes.src.match("\.js$")) {
            return tag;
        }
        const asset = assets[tag.attributes.src];
        if (asset == null) {
            return tag;
        }
        return {tagName: 'script', innerHTML: asset.source(), closeTag: true};
    }

    apply(compiler) {
        let publicPath = compiler.options.output.publicPath || '';
        if (publicPath && !publicPath.endsWith('/')) {
            publicPath += '/';
        }

        compiler.hooks.compilation.tap('InlineSourceHtmlPlugin', compilation => {
            const tagFunction = tag => this.getInlinedTag(publicPath, compilation.assets, tag);
            const hooks = HtmlWebpackPlugin.getHooks(compilation);
            hooks.alterAssetTagGroups.tap('InlineChunkHtmlPlugin', assets => {
                assets.headTags = assets.headTags.map(tagFunction);
                assets.bodyTags = assets.bodyTags.map(tagFunction);
            });
        });
    }
}


module.exports = merge(common, {
    mode: 'production',
    plugins: [
        new CleanWebpackPlugin({
            cleanAfterEveryBuildPatterns: ['*', '!index.html.gz'],
            protectWebpackAssets: false
        }),
        new InlineJsHtmlPlugin(),
        new CompressionPlugin()
    ]
});