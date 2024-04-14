import Taro from '@tarojs/taro';
import { useState } from 'react';
import { View, Button } from '@tarojs/components';
import { AtImagePicker } from 'taro-ui';
import { ImagePickerFile } from 'taro-ui/types/image-picker';

// 引入 Google Cloud Vision API
const vision = require('@google-cloud/vision');

const ImageRecognition: Taro.FC = () => {
  const [imageFile, setImageFile] = useState<ImagePickerFile[]>([]);
  const [extractedText, setExtractedText] = useState<string>('');

  // 设置 Google Cloud 服务账号凭证文件路径
  const credentialPath = '/path/to/your/credential.json';
  const client = new vision.ImageAnnotatorClient({
    keyFilename: credentialPath,
  });

  // 提取图片中的文字
  const extractTextFromImage = async () => {
    if (imageFile.length === 0) {
      Taro.showToast({
        title: '请先选择图片',
        icon: 'none',
      });
      return;
    }

    const imageUrl = imageFile[0].url;
    try {
      const [result] = await client.textDetection(imageUrl);
      const detections = result.textAnnotations;
      
      // 提取识别到的文本
      let extractedText = '';
      for (const text of detections) {
        extractedText += text.description + '\n';
      }
      
      setExtractedText(extractedText);
    } catch (error) {
      console.error('Error extracting text:', error);
      Taro.showToast({
        title: '提取文字出错',
        icon: 'none',
      });
    }
  };

  // 处理图片选择
  const handleImageChange = (files: ImagePickerFile[]) => {
    setImageFile(files);
  };

  return (
    <View>
      <AtImagePicker
        files={imageFile}
        onChange={handleImageChange}
        mode='aspectFill'
      />
      <Button onClick={extractTextFromImage}>提取图片文字</Button>
      <View>
        <Text>提取结果：</Text>
        <Text>{extractedText}</Text>
      </View>
    </View>
  );
};

export default ImageRecognition;
