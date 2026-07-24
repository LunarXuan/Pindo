export const zh = {
  // nav
  'nav.start': '开始创作',
  'nav.features': '特性',
  'nav.faq': 'FAQ',
  'nav.colors': '品牌色板',

  // hero
  'hero.title': '图片秒变拼豆图纸',
  'hero.desc': '上传图片并生成带网格、色号和用量统计的拼豆图纸。',
  'hero.noReg': '✅ 无需注册',
  'hero.local': '✅ 浏览器端处理',
  'hero.free': '✅ 完全免费',
  'hero.cta': '🚀 立即开始',

  // steps
  'steps.title': '三步生成拼豆图纸',
  'step1.title': '上传图片',
  'step1.desc': '拖拽或点击上传 PNG/JPG/WebP，支持透明图片',
  'step2.title': '调整参数',
  'step2.desc': '选择品牌、尺寸、抖动模式，实时预览效果',
  'step3.title': '导出图纸',
  'step3.desc': '下载 PNG/PDF 图纸，附带色号和用量清单',

  // tool
  'tool.title': '🛠️ 图纸生成器',
  'tool.generating': '生成中...',

  // features
  'features.title': 'Pindo 功能',
  'features.subtitle': '面向拼豆制作的本地图纸工具',
  'feat1.title': '品牌色板',
  'feat1.desc': '覆盖 Perler / Hama / Artkal S / MARD / COCO / 漫漫 / 盼盼 / 咪小窝，每种颜色都能买到实物',
  'feat2.title': 'CIEDE2000 色差匹配',
  'feat2.desc': '感知色差金标准算法，肤色、渐变、阴影都精准还原',
  'feat3.title': '线性RGB下采样',
  'feat3.desc': 'Gamma-correct 均值算法，避免传统下采样的亮度偏差',
  'feat4.title': 'PDF 1:1 标尺导出',
  'feat4.desc': '校准框+十字准星+分板定位，打印即用',
  'feat5.title': '逐格编辑+撤销',
  'feat5.desc': '差量 patch 撤销/重做，内存占用极低',
  'feat6.title': '100% 浏览器端处理',
  'feat6.desc': '图片不上传服务器，隐私安全有保障',

  // reviews
  'reviews.title': '用户评价',
  'review1.name': 'Emily',
  'review1.role': '手工爱好者',
  'review1.text': '终于找到颜色准确的生成器了！做了一个马里奥，颜色和实物完全一致。',
  'review2.name': 'Sarah',
  'review2.role': 'Etsy 卖家',
  'review2.text': '以前手绘图纸要几小时，现在几分钟搞定。用量清单帮我精确控制成本。',
  'review3.name': '小明',
  'review3.role': '拼豆新手',
  'review3.text': '第一次做拼豆就成功了！PDF打印出来跟着做就行，色号标得很清楚。',

  // faq
  'faq.title': '常见问题',
  'faq1.q': '需要注册账号吗？',
  'faq1.a': '不需要。直接上传图片即可使用，无需注册、无需登录。',
  'faq2.q': '支持哪些拼豆品牌？',
  'faq2.a': '支持 MARD、Hama、Perler、Artkal S、COCO、漫漫、盼盼、咪小窝等品牌。',
  'faq3.q': '图片会上传到服务器吗？',
  'faq3.a': '不会。所有图像处理都在浏览器本地完成，你的图片不会离开你的设备。',
  'faq4.q': '为什么颜色比其他工具更准？',
  'faq4.a': '我们使用 CIEDE2000 感知色差算法 + 线性RGB下采样，这是色彩科学的金标准。',
  'faq5.q': 'PDF 打印出来尺寸对吗？',
  'faq5.a': '每页左上角有 10mm×10mm 校准框，打印后量一下即可验证缩放比例。',

  // cta
  'cta.title': '开始创作你的拼豆图纸',
  'cta.subtitle': '免费、无需注册、浏览器端处理',
  'cta.btn': '🎨 立即开始',

  // footer
  'footer.tagline': '拼豆图纸生成器',
  'footer.desc': '本地处理 · 品牌色板 · 色号统计',

  // upload
  'upload.drag': '拖拽图片到此处，或点击上传',
  'upload.formats': '支持 PNG / JPG / WebP，最大 10MB',
  'upload.change': '更换图片',
  'upload.size': '原图尺寸',
  'upload.fileSize': '文件大小',

  // preview
  'preview.empty': '上传图片后生成图纸预览',
  'preview.grid': '网格',
  'preview.codes': '色号',
  'preview.boards': '拼板',

  // params
  'param.brand': '品牌',
  'param.width': '宽度（珠）',
  'param.height': '高度（珠）',
  'param.lock': '锁定比例',
  'param.dithering': '抖动算法',
  'param.dithOff': '关闭',
  'param.background': '底色',
  'param.bgWhite': '白色',
  'param.bgBlack': '黑色',
  'param.bgTransparent': '透明',
  'param.maxColors': '最大颜色数',
  'param.maxColorsAll': '全部',
  'param.brightness': '亮度',
  'param.contrast': '对比度',
  'param.saturation': '饱和度',
  'param.sharpness': '锐度',
  'param.sharpnessHint': '💡 小尺寸建议：提高对比度 +15~30，锐度 +30~60，颜色数 5~10',
  'param.lowResOptimize': '低像素优化',
  'param.lowResOptimizeHint': '≤40×40 建议开启：自动裁切主体、保留关键颜色并清理孤立噪点',
  'param.reset': '重置',
  'param.boardSize': '拼板尺寸',
  'param.boardCount': '需要拼板',
  'param.boardUnit': '块',
  'param.totalBeads': '总珠数',
  'param.colorCount': '使用颜色',
  'param.sizeGroup': '尺寸设置',
  'param.imageGroup': '图像调整',
  'param.advancedGroup': '高级选项',

  // editor
  'editor.undo': '↩ 撤销',
  'editor.redo': '↪ 重做',
  'editor.hint': '选择颜色后点击图纸编辑',
  'editor.batchTitle': '批量替换颜色',
  'editor.from': '替换源...',
  'editor.to': '目标色...',
  'editor.replaceAll': '替换全部',

  // color picker
  'color.title': '色板选择器',
  'color.search': '搜索颜色名称或编号...',
  'color.empty': '无匹配颜色',

  // export
  'export.title': '导出图纸',

  // usage
  'usage.title': '用量统计',
  'usage.unit': '颗',
  'usage.exportCsv': '导出 CSV',
  'usage.color': '颜色',
  'usage.code': '编号',
  'usage.name': '名称',
  'usage.count': '数量',

  'param.pixMode': '像素化模式',
  'param.pixAverage': '均值（写实）',
  'param.pixDominant': '主色（卡通）',
  'param.pixEdgeAware': '边缘优先（清晰）',
  'editor.floodHint': 'Shift+点击：油漆桶填充',

  'palette.edit': '自定义色板',
  'palette.selectAll': '全选',
  'palette.deselectAll': '清空',
  'palette.selected': '已选 {0}/{1} 色',
  'palette.apply': '应用',
  'palette.close': '关闭',

  'brand.perler': 'Perler',
  'brand.hama': 'Hama',
  'brand.artkal-s': 'Artkal S',
  'brand.mard': 'MARD',
  'brand.coco': 'COCO',
  'brand.manman': '漫漫',
  'brand.panpan': '盼盼',
  'brand.mixiaowo': '咪小窝',

  // focus
  'focus.enter': '🧩 进入拼装模式',
  'focus.title': '专注拼装',
  'focus.back': '← 返回生成器',
  'focus.colors': '颜色列表',
  'focus.current': '当前颜色',
  'focus.progress': '总进度',
  'focus.timer': '计时',
  'focus.pause': '暂停',
  'focus.resume': '继续',
  'focus.reset': '重置计时',
  'focus.completed': '已完成',
  'focus.remaining': '剩余',
  'focus.colorDone': '颜色完成！',
  'focus.allDone': '🎉 全部完成！',
  'focus.allDoneDesc': '恭喜你完成了整幅拼豆作品！',
  'focus.totalTime': '总用时',
  'focus.noData': '没有图纸数据，请先生成图纸',
  'focus.clickHint': '点击当前颜色的区域标记为已完成',

  // export quality
  'export.quality': '导出画质',
  'export.low': '标准',
  'export.mid': '高清',
  'export.high': '超清',
  'export.ultra': '印刷级',
} as const;

export type I18nKey = keyof typeof zh;
