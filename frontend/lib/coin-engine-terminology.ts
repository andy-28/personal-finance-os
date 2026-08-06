export const coinTerminology = {
  actions: {
    addHudWidget: "新增介面",
    addFirstHudWidget: "新增第一個介面",
    editHudWidget: "編輯介面",
    removeHudWidget: "移除介面",
    addToHud: "加入我的介面",
    saveChanges: "儲存變更",
    previousStep: "上一步",
    close: "關閉"
  },
  status: {
    stable: { label: "穩定版", systemLabel: "STABLE" },
    experimental: { label: "實驗中", systemLabel: "EXPERIMENTAL" },
    workshopOnly: { label: "工坊限定", systemLabel: "WORKSHOP ONLY" },
    comingSoon: { label: "即將開放", systemLabel: "COMING SOON" },
    planned: { label: "規劃中", systemLabel: "PLANNED" },
    available: { label: "可使用", systemLabel: "AVAILABLE" },
    unavailable: { label: "暫不可用", systemLabel: "UNAVAILABLE" },
    active: { label: "啟用中", systemLabel: "ACTIVE" },
    inactive: { label: "已停用", systemLabel: "INACTIVE" },
    completed: { label: "已完成", systemLabel: "COMPLETED" },
    prototype: { label: "原型", systemLabel: "PROTOTYPE" },
    mockOnly: { label: "僅模擬資料", systemLabel: "MOCK ONLY" }
  },
  hud: {
    title: "我的介面",
    systemLabel: "PERSONAL HUD",
    heroDescription: "你選擇追蹤的財務資訊。",
    emptyTitle: "尚未建立個人介面",
    emptyDescription: "從介面庫選擇一種呈現方式，開始追蹤重要的財務資訊。",
    widgetNames: {
      resourceGuide: { label: "資源指引", systemLabel: "RESOURCE GUIDE" },
      soulInterface: { label: "靈魂儀表", systemLabel: "SOUL INTERFACE" },
      gameNumber: { label: "數值面板", systemLabel: "GAME NUMBER" },
      goalBar: { label: "目標血條", systemLabel: "GOAL BAR" },
      gameGauge: { label: "財務量表", systemLabel: "GAME GAUGE" }
    },
    wizard: {
      steps: {
        select: {
          title: "選擇介面",
          purpose: "挑選要加入個人介面的呈現方式。"
        },
        source: {
          title: "選擇資料",
          purpose: "選擇這個介面要追蹤的財務資料。"
        },
        configure: {
          title: "設定顯示",
          purpose: "調整標題、內容與顯示方式。"
        },
        preview: {
          title: "確認預覽",
          purpose: "確認介面呈現後，加入我的介面。"
        }
      },
      nextLabels: {
        select: "下一步：選擇資料",
        source: "下一步：設定顯示",
        configure: "下一步：確認預覽",
        preview: "加入我的介面"
      }
    },
    dataSources: {
      goal: {
        title: "財務目標",
        description: "追蹤一個已建立的財務目標。",
        emptyDescription: "目前尚未建立可使用的財務目標。"
      },
      account: {
        title: "帳戶餘額",
        description: "未來可顯示現金、銀行帳戶及其他帳戶餘額。"
      },
      financeSummary: {
        title: "財務摘要",
        description: "未來可顯示淨值、總資產、總負債與現金流。"
      }
    },
    fields: {
      title: "標題",
      subtitle: "副標題",
      visualStyle: "視覺樣式",
      resourceGuideStyle: "資源指引樣式",
      actionLabel: "操作標籤",
      bonusLabel: "加成標籤",
      numberStyle: "數字樣式",
      showSlots: "顯示插槽",
      showStateBadge: "顯示狀態徽章",
      valueMode: "數值模式",
      prefix: "前綴",
      suffix: "後綴",
      progressStyle: "進度條樣式",
      gaugeStyle: "量表樣式",
      showCurrent: "顯示目前金額",
      showMaximum: "顯示目標金額",
      showAmount: "顯示金額",
      showValue: "顯示數值",
      showPercentage: "顯示百分比",
      showRemaining: "顯示剩餘金額"
    },
    variants: {
      cyan: "乙太青",
      adventure: "冒險綠",
      quest: "任務金",
      default: "預設",
      finance: "財務",
      damage: "傷害數字",
      aether: "乙太",
      purple: "紫色",
      yellow: "黃色"
    },
    feedback: {
      added: "已加入我的介面",
      saved: "已儲存介面變更",
      removed: "已移除介面",
      reordered: "已更新介面順序"
    }
  },
  emptyState: {
    hud: {
      title: "尚未建立個人介面",
      description: "從介面庫選擇一種呈現方式，開始追蹤重要的財務資訊。"
    },
    hudDataSourceLost: {
      title: "此介面的資料來源已失效",
      description: "原本綁定的財務目標已不存在。你可以重新設定或移除此介面。"
    },
    hudUnsupportedWidget: {
      title: "此介面版本目前無法顯示",
      description: "你可以重新設定或移除此介面。"
    },
    hudStorageCorrupted: {
      title: "個人介面設定無法讀取",
      description: "你可以重新建立或移除異常資料。"
    },
    hudUnsupportedSchema: {
      title: "個人介面設定無法讀取",
      description: "此介面設定來自較新的版本，目前無法載入。"
    },
    workshop: {
      title: "此實驗區目前尚無內容",
      description: "新的介面元件與測試工具會在這裡逐步加入。"
    }
  },
  workshop: {
    title: "介面工坊",
    systemLabel: "AETHER WORKSHOP",
    description: "設計、測試並驗證 Coin Engine 的介面元件。",
    sections: {
      appearance: { label: "外觀設定", systemLabel: "APPEARANCE" },
      assets: { label: "素材庫", systemLabel: "ASSETS" },
      uiLab: { label: "介面實驗室", systemLabel: "UI LAB" },
      layoutLab: { label: "版面實驗室", systemLabel: "LAYOUT LAB" },
      desktopLab: { label: "桌面實驗室", systemLabel: "DESKTOP LAB" },
      numberLab: { label: "數字特效工坊", systemLabel: "AETHER NUMBER LAB" }
    },
    assets: {
      registry: { label: "素材註冊表", systemLabel: "ASSET REGISTRY" },
      library: { label: "素材庫", systemLabel: "ASSET LIBRARY" },
      preview: { label: "素材預覽", systemLabel: "ASSET PREVIEW" },
      builtIn: "內建素材",
      external: "外部素材",
      current: "目前"
    },
    preview: {
      live: "即時預覽",
      reset: "重設預覽",
      matrix: "預覽矩陣",
      effect: "效果預覽",
      normal: "一般狀態",
      edgeCases: "邊界案例"
    },
    inspector: {
      title: "設定面板",
      resourceGuide: "資源指引設定",
      soulInterface: "靈魂儀表設定",
      gameNumber: "數值面板設定",
      gameGauge: "財務量表設定"
    },
    prototype: {
      notice: "原型 · 僅模擬資料",
      localNotice: "此區為原型，只使用模擬資料，不寫入正式財務資料。"
    },
    fields: {
      title: "標題",
      description: "說明",
      resourceLabel: "資源標籤",
      current: "目前數值",
      maximum: "最大值",
      statusLabel: "狀態標籤",
      footerLabel: "底部標籤",
      variant: "視覺樣式",
      compact: "精簡模式",
      glow: "光暈",
      radius: "圓角",
      gaugeHeight: "量表高度",
      numberStroke: "數字描邊",
      bonusLabel: "加成標籤",
      bonusValue: "加成數值",
      actionLabel: "操作標籤",
      state: "狀態",
      numberStyle: "數字樣式",
      value: "數值",
      prefix: "前綴",
      suffix: "後綴",
      size: "尺寸",
      outline: "外框",
      label: "標籤",
      showValue: "顯示數值",
      showPercentage: "顯示百分比",
      animated: "啟用動畫"
    },
    widgets: {
      missionPanel: "任務面板",
      notificationPanel: "通知面板",
      inventoryGrid: "物品欄格線",
      resourcePanel: "資源面板",
      window: "視窗",
      panel: "面板"
    },
    layout: {
      previews: "版面預覽",
      structureSketches: "結構草圖",
      mockStaticPreview: "模擬資料 · 靜態預覽"
    },
    numberLab: {
      title: "數字特效工坊",
      systemLabel: "AETHER NUMBER LAB",
      library: "數字樣式庫",
      livePreview: "即時預覽",
      appearance: "外觀設定",
      effects: "特效設定",
      layout: "排列設定",
      advanced: "進階設定",
      playEffect: "播放特效",
      resetPreview: "重設預覽"
    }
  },
  desktop: {
    lab: "桌面實驗室",
    systemLabel: "DESKTOP LAB",
    mode: "桌面模式",
    prototype: "桌面模式原型",
    wallpaper: "桌布",
    windowSkin: "視窗外觀",
    windowPresets: "視窗預設",
    draggableWindows: "可拖曳視窗",
    resetLayout: "重設版面",
    resetAppearance: "重設外觀",
    mockOnly: "僅模擬資料"
  }
} as const;
