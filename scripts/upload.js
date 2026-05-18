const ci = require('miniprogram-ci');
const path = require('path');

const project = new ci.Project({
  appid: 'wx67a2139e59a01586',
  type: 'miniProgram',
  projectPath: path.resolve(__dirname, '..'),
  privateKeyPath: path.resolve(__dirname, '..', 'private.wx67a2139e59a01586.key'),
  ignores: ['node_modules/**/*', 'cloudfunctions/**/*'],
});

async function upload() {
  try {
    const result = await ci.upload({
      project,
      version: '1.0.2',
      desc: '修复基础库版本配置',
      setting: {
        es6: true,
        es7: true,
        minify: true,
        autoPrefixWXSS: true,
      },
    });
    console.log('上传成功！', result);
  } catch (e) {
    console.error('上传失败', e);
  }
}

upload();
