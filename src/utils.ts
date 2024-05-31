import Taro from '@tarojs/taro'
import * as XLSX from 'xlsx';


 Taro.cloud.init({
    env: 'lurun-3g2n26afd5946d56' // 替换为你的云开发环境 ID
  })
export const db =  Taro.cloud.database()



export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export const getCurDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  return `${year}-${month}-${day}`;
};


// 获取当前日期时间的字符串
export const getCurrentDateTimeString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const dateString = `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;
  return dateString;
};


//根据公司名称获取数据库标记前缀
export const getPrefixByCompany = (company: string) => {
  switch(company){
    case '永和': return 'yh_';
    case '鲁润': return 'lr_';
    case '国基': return 'gj_';
    case '测试': return 'test_';
    default: return ''
  }
}


// 导出数据到 Excel
export const exportToExcel = async () => {
  try {
    const data_prefix = getPrefixByCompany(Taro.getStorageSync('company'));
    const countRes = await db.collection(data_prefix + 'stock').count();
    const total = countRes.total;
    const batchSize = 20;
    const batchTimes = Math.ceil(total / batchSize);

    let allData = [];
    for (let i = 0; i < batchTimes; i++) {
      let batchQuery = db.collection(data_prefix + 'stock').skip(i * batchSize).limit(batchSize);
      const res = await batchQuery.get();
      allData = allData.concat(res.data);
    }

    // 数据转换为 Excel 格式
    const worksheet = XLSX.utils.json_to_sheet(allData);

    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // 将工作簿转换为二进制数据
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    // 将二进制数据转换为 ArrayBuffer
    const arrayBuffer = new Uint8Array(excelBuffer).buffer;

    // 生成临时文件路径
    const filePath = Taro.env.USER_DATA_PATH + '/data.xlsx';

    // 将 ArrayBuffer 保存到文件
    Taro.getFileSystemManager().writeFile({
      filePath: filePath,
      data: arrayBuffer,
      success: () => {
        // 提示用户导出成功
        Taro.showToast({
          title: '导出成功',
          icon: 'success',
          duration: 2000
        });

        // 给用户提供一个按钮，点击后打开文件或分享文件
        Taro.showModal({
          title: '导出成功',
          content: '是否打开或分享导出的文件？',
          confirmText: '打开',
          cancelText: '分享',
          success: (res) => {
            if (res.confirm) {
              // 打开文件
              Taro.openDocument({
                filePath: filePath,
                success: () => {
                  console.log('打开成功');
                },
                fail: (err) => {
                  console.error('打开失败:', err);
                  // 提示用户打开失败
                  Taro.showToast({
                    title: '打开失败，请重试',
                    icon: 'none',
                    duration: 2000
                  });
                }
              });
            } else if (res.cancel) {
              // 分享文件
              Taro.shareFileMessage({
                filePath: filePath,
                success: () => {
                  console.log('分享成功');
                },
                fail: (err) => {
                  console.error('分享失败:', err);
                  // 提示用户分享失败
                  Taro.showToast({
                    title: '分享失败，请重试',
                    icon: 'none',
                    duration: 2000
                  });
                }
              });
            }
          }
        });
      },
      fail: (err) => {
        console.error('保存文件失败:', err);
        // 提示用户导出失败
        Taro.showToast({
          title: '导出失败，请重试',
          icon: 'none',
          duration: 2000
        });
      }
    });

    return filePath;
  } catch (error) {
    console.error('导出数据错误:', error);
    // 提示用户导出失败
    Taro.showToast({
      title: '导出失败，请重试',
      icon: 'none',
      duration: 2000
    });
    return null;
  }
};
