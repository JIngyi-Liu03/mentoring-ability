// ============================================================
// server/src/services/sms.service.js —— 腾讯云短信发送服务
//
// 职责：
//   - 发送短信验证码
//   - 腾讯云错误码 → 中文提示翻译
// ============================================================

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

// 腾讯云短信错误码 → 中文提示
const ERROR_MAP = {
  'LimitExceeded.PhoneNumberDailyLimit': '该手机号今日发送验证码次数已达上限，请明天再试',
  'LimitExceeded.PhoneNumberOneHourLimit': '该手机号一小时内发送次数已达上限，请稍后再试',
  'LimitExceeded.PhoneNumberThirtySecondLimit': '发送太频繁，请 30 秒后再试',
  'FailedOperation.PhoneNumberInBlacklist': '该手机号因退订被列入黑名单，无法发送',
  'InvalidParameterValue.IncorrectPhoneNumber': '手机号格式错误，请检查后重试',
  'LimitExceeded.AppDailyLimit': '系统今日短信发送量已达上限，请联系管理员',
  'FailedOperation.TemplateIncorrectOrUnapproved': '短信模板未审核或不存在，请联系管理员',
  'FailedOperation.SignatureIncorrectOrUnapproved': '短信签名未审核或不存在，请联系管理员',
  'InvalidParameter': '请求参数错误，请联系管理员',
  'UnauthorizedOperation.SmsQcloudSmsCheckFail': '校验失败，请联系管理员',
  'FailedOperation.InsufficientBalanceInSmsPackage': '短信套餐包余额不足，请联系管理员'
}

function translateError(code, message) {
  if (ERROR_MAP[code]) return ERROR_MAP[code]
  return `短信发送失败（${code}）`
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
    const code = status ? status.Code : 'UnknownError'
    const msg = status ? status.Message : '未知错误'
    throw new Error(translateError(code, msg))
  }
  return res
}
