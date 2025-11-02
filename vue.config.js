module.exports = {
  transpileDependencies: ['ol'],
  configureWebpack: {
    module: {
      rules: [
        {
          test: /\.js$/,
          include: /node_modules[/\\]ol/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@vue/cli-plugin-babel/preset']
            }
          }
        }
      ]
    }
  }
}

