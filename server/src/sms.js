// 腾讯云短信发送封装（仅用于发送验证码）。
// 凭证使用 .env 中的子用户 SecretId/SecretKey（仅 sms 权限）。
import tencentcloud from 'tencentcloud-sdk-nodejs-sms'

const SmsClient = tencentcloud.sms.v20210111.Client

let _client = null
function client() {
  if (_client) return _client
  _client = new SmsClient({
    credential: {
      secretId: process.env.TENCENT_SECRET_ID,
      secretKey: process.env.TENCENT_SECRET_KEY
    },
    region: 'ap-guangzhou',
    profile: { httpProfile: { endpoint: 'sms.tencentcloudapi.com' } }
  })
  return _client
}

// phone: 11 位手机号（不含 +86）；code: 验证码字符串
export async function sendSmsCode(phone, code) {
  if (!process.env.TENCENT_SECRET_ID || !process.env.SMS_SDK_APP_ID) {
    throw new Error('短信未配置（缺少 SecretId / SdkAppId）')
  }
  const res = await client().SendSms({
    PhoneNumberSet: ['+86' + phone],
    SmsSdkAppId: process.env.SMS_SDK_APP_ID,
    SignName: process.env.SMS_SIGN_NAME,
    TemplateId: process.env.SMS_TEMPLATE_ID,
    TemplateParamSet: [code]
  })
  const status = res && res.SendStatusSet && res.SendStatusSet[0]
  if (!status || status.Code !== 'Ok') {
    const msg = status ? `${status.Code}: ${status.Message}` : '未知错误'
    throw new Error('短信发送失败：' + msg)
  }
  return res
}

export default { sendSmsCode }
