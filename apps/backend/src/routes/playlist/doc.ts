import type { OpenAPIHono } from '@hono/zod-openapi'
import { createRoute } from '@hono/zod-openapi'
import { DefaultErrorResponses, jsonResponse, registerHandler } from '@/app/rest/openapi.js'
import { playlistController } from '@/routes/playlist/controller.js'
import {
  PlaylistParamsSchema,
  PlaylistQuerySchema,
  PlaylistResponseSchema,
  PlaylistSchema,
} from '@/routes/playlist/modal.js'

const getPlaylistRoute = createRoute({
  method: 'get',
  path: '/playlist',
  tags: ['Playlist'],
  request: {
    query: PlaylistQuerySchema,
  },
  responses: {
    200: jsonResponse(PlaylistResponseSchema, 'Paginated playlists for device'),
    400: DefaultErrorResponses[400],
    500: DefaultErrorResponses[500],
  },
})

const getPlaylistByIdRoute = createRoute({
  method: 'get',
  path: '/playlist/{id}',
  tags: ['Playlist'],
  request: {
    params: PlaylistParamsSchema,
  },
  responses: {
    200: jsonResponse(PlaylistSchema, 'Playlist by id'),
    400: DefaultErrorResponses[400],
    404: DefaultErrorResponses[404],
    500: DefaultErrorResponses[500],
  },
})

export const PlaylistDoc = {
  register(api: OpenAPIHono): void {
    registerHandler(api, getPlaylistRoute, playlistController.getPlaylist)
    registerHandler(api, getPlaylistByIdRoute, playlistController.getPlaylistById)
  },
}
