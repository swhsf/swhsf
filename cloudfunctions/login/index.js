// 这是 2026 微信云函数唯一正确的获取 openid 写法
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const context = cloud.getWXContext()
  return { openid: context.OPENID }
}