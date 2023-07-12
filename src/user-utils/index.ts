import { translate } from '@/i18n'
import store from '@/store'
import { alertController } from '@ionic/core'

const getAndSetUserDetails = async (payload: any) => store.dispatch('user/getAndSetUserDetails', payload)

const getUserTokenAndOms = async () => {
  return {
    appToken: store.getters['user/getUserToken'],
    appOms: store.getters['user/getInstanceUrl']
  }
}

const confirmSessionEnd = (appOms: string) => {
  return new Promise((resolve: any) => {
    alertController
      .create({
        header: translate('Active session'),
        message: translate(`A user is already logged in via ${appOms}. Do you want to end the current session and login with the entered details?`),
        buttons: [{
          text: translate("Cancel"),
          handler: () => resolve(false)
        }, {
          text: translate('Login'),
          handler: () => resolve(true)
        }],
      }).then((alert: any) => {
        alert.present()
      });
  })
}

const logout = async () => store.dispatch('user/logout')

export {
  getAndSetUserDetails,
  getUserTokenAndOms,
  confirmSessionEnd,
  logout
}