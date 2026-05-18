Page({
  data: { count: 0 },

  onLoad(options) {
    this.setData({ count: options.count || 0 });
  },

  back() {
    wx.navigateBack({ delta: 2 });
  }
});