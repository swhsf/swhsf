App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-0gsy4pbj68541eee',
        traceUser: true
      })
    }

    this.login()
  },

  async login() {
    try {
      const res = await wx.cloud.callFunction({ name: 'login' })
      this.globalData.openid = res.result.openid
      console.log("登录成功 openid =", res.result.openid)
    } catch (e) {
      console.error("登录失败", e)
    }
  },

  globalData: {
    openid: null,
    dailyGoal: 20,
    finishedToday: 0
  }
})