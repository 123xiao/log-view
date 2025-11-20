const bcrypt = require('bcryptjs');

// 测试密码验证
async function testPasswordValidation() {
  const plainPassword = '123456';
  
  // 生成哈希
  const hash = await bcrypt.hash(plainPassword, 10);
  console.log('生成的哈希:', hash);
  
  // 验证密码
  const isValid = await bcrypt.compare(plainPassword, hash);
  console.log('密码验证结果:', isValid);
  
  // 测试错误密码
  const isInvalid = await bcrypt.compare('wrongpassword', hash);
  console.log('错误密码验证结果:', isInvalid);
}

testPasswordValidation();