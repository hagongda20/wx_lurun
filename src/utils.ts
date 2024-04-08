import Taro from '@tarojs/taro'


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

  return `${month}-${day} ${hours}`;
}

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
    default: return ''
  }
}

