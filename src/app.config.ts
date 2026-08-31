export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/service/index',
    'pages/shop/index',
    'pages/record/index',
    'pages/mine/index',
    'pages/constitution/quiz/index',
    'pages/constitution/result/index',
    'pages/service/detail/index',
    'pages/acupoint/index/index',
    'pages/acupoint/detail/index',
    'pages/shop/detail/index',
    'pages/shop/cart/index',
    'pages/shop/order/index',
    'pages/order/create/index',
    'pages/order/list/index',
    'pages/order/detail/index',
    'pages/disease/index/index',
    'pages/disease/detail/index'
  ],
  window: {
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: '#fdf8f0',
    navigationBarTitleText: '颐养堂',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#9a8e85',
    selectedColor: '#c8362f',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页',
        iconPath: 'assets/tabbar/home.svg',
        selectedIconPath: 'assets/tabbar/home-selected.svg'
      },
      {
        pagePath: 'pages/service/index',
        text: '服务',
        iconPath: 'assets/tabbar/service.svg',
        selectedIconPath: 'assets/tabbar/service-selected.svg'
      },
      {
        pagePath: 'pages/shop/index',
        text: '商城',
        iconPath: 'assets/tabbar/shop.svg',
        selectedIconPath: 'assets/tabbar/shop-selected.svg'
      },
      {
        pagePath: 'pages/record/index',
        text: '档案',
        iconPath: 'assets/tabbar/record.svg',
        selectedIconPath: 'assets/tabbar/record-selected.svg'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的',
        iconPath: 'assets/tabbar/mine.svg',
        selectedIconPath: 'assets/tabbar/mine-selected.svg'
      }
    ]
  }
})
