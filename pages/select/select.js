const textbooks = require('../../data/textbooks.js');
const app = getApp();

Page({
  data: {
    textbooks: [],
    textbookNames: [],
    selectedTextbook: '',
    units: [],
    selectedUnit: '',
    step: 'textbook' // 'textbook' | 'unit'
  },

  onLoad() {
    const names = Object.keys(textbooks);
    this.setData({
      textbooks: textbooks,
      textbookNames: names,
      selectedTextbook: app.globalData.selectedTextbook || names[0] || ''
    });
    this.loadUnits();
  },

  loadUnits() {
    const { selectedTextbook, textbooks } = this.data;
    if (selectedTextbook && textbooks[selectedTextbook]) {
      const unitNames = Object.keys(textbooks[selectedTextbook]);
      this.setData({
        units: unitNames,
        selectedUnit: app.globalData.selectedUnit || unitNames[0] || ''
      });
    }
  },

  selectTextbook(e) {
    const name = e.currentTarget.dataset.name;
    this.setData({ selectedTextbook: name });
    this.loadUnits();
  },

  selectUnit(e) {
    const unit = e.currentTarget.dataset.unit;
    this.setData({ selectedUnit: unit });
  },

  confirm() {
    const { selectedTextbook, selectedUnit } = this.data;
    if (!selectedTextbook || !selectedUnit) {
      wx.showToast({ title: '请选择教材和单元', icon: 'none' });
      return;
    }
    app.globalData.selectedTextbook = selectedTextbook;
    app.globalData.selectedUnit = selectedUnit;
    wx.navigateBack();
  }
});
