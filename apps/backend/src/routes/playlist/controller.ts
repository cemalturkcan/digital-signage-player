import type { Context } from 'hono'
import { getNonEmptyString, getPage, getPageSize } from '@/app/rest/params.js'
import { Res } from '@/app/rest/rest.js'
import { playlistService } from '@/routes/playlist/service.js'

export const playlistController = {
  async getPlaylistsByDeviceId(c: Context) {
    const deviceId = getNonEmptyString(c.req.query('deviceId'))
    const page = getPage(c.req.query('page'))
    const pageSize = getPageSize(c.req.query('pageSize'))

    const result = await playlistService.getPlaylistsByDeviceId(deviceId ?? '', page, pageSize)

    return Res(result)
  },
}
