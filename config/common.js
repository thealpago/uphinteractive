const path = require('path');
const webpack = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const __root = path.resolve(__dirname, '../');

module.exports = {
	entry: {
		index: [path.resolve(__root, 'src/scripts/index.js')],
	},
	output: {
		path: path.resolve(__root, 'dist'),
		filename: 'scripts/[name].[contenthash].js',
		chunkFilename: 'scripts/[name].[contenthash].js',
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: ['@babel/preset-env'],
						plugins: ['@babel/plugin-syntax-dynamic-import']
					}
				},
				exclude: /node_modules/
			},
			{
				test: /\.(glsl|frag|vert)$/,
				type: 'asset/source',
				use: ['glslify-loader']
			},
			{
				test: /\.css$/,
				use: ['style-loader', 'css-loader']
			}
		]
	},
	resolve: {
		alias: {
			'@': path.resolve(__root, 'src'),
		},
		fallback: {
			"fs": false,
			"path": false,
		}
	},
	plugins: [
		new CleanWebpackPlugin(),
		new CopyWebpackPlugin({
			patterns: [
				{
					from: path.resolve(__root, 'static'),
					to: path.resolve(__root, 'dist'),
					noErrorOnMissing: true
				}
			]
		}),
		new HtmlWebpackPlugin({
			template: './src/index.html',
		}),
		new webpack.ProvidePlugin({
			'THREE': 'three'
		})
	]
};
