import type { Context } from 'hono'
import { ErrorCode } from '@/app/rest/codes.js'
import { getNonEmptyString, getPage, getPageSize, getPositiveInteger } from '@/app/rest/params.js'
import { fail, Res } from '@/app/rest/rest.js'
import { playlistService } from '@/routes/playlist/service.js'

export const playlistController = {
  async getPlaylistsByDeviceId(c: Context) {
    const deviceId = getNonEmptyString(c.req.query('deviceId'))
    const page = getPage(c.req.query('page'))
    const pageSize = getPageSize(c.req.query('pageSize'))

    const result = await playlistService.getPlaylistsByDeviceId(deviceId ?? '', page, pageSize)

    return Res(result)
  },

  async getPlaylistById(c: Context) {
    const deviceId = getNonEmptyString(c.req.query('deviceId'))
    const playlistId = getPositiveInteger(c.req.param('id'))

    if (!deviceId) {
      return Res(fail(ErrorCode.BAD_REQUEST, 'deviceId required'))
    }

    if (!playlistId) {
      return Res(fail(ErrorCode.BAD_REQUEST, 'playlist id must be a positive integer'))
    }

    const result = await playlistService.getPlaylistById(deviceId, playlistId)
    return Res(result)
  },
}
