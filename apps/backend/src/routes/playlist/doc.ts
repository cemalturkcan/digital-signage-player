import type { OpenAPIHono } from '@hono/zod-openapi'
import { createRoute } from '@hono/zod-openapi'
import { DefaultErrorResponses, jsonResponse, registerHandler } from '@/app/rest/openapi.js'
import { playlistController } from '@/routes/playlist/controller.js'
import { PlaylistQuerySchema, PlaylistResponseSchema } from '@/routes/playlist/modal.js'

const getPlaylistRoute = createRoute({
  method: 'get',
  path: '/playlist',
  tags: ['Playlist'],
  request: {
    query: PlaylistQuerySchema,
  },
  responses: {
    200: jsonResponse(PlaylistResponseSchema, 'Paginated playlist list for device'),
    400: DefaultErrorResponses[400],
    500: DefaultErrorResponses[500],
  },
})

export const PlaylistDoc = {
  register(api: OpenAPIHono): void {
    registerHandler(api, getPlaylistRoute, playlistController.getPlaylistsByDeviceId)
  },
}
