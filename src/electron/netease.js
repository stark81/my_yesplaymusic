import { pathCase } from 'change-case';

async function netease(fastify) {
  const NeteaseCloudMusicApi = require('NeteaseCloudMusicApi');
  const getHandler = neteaseApi => {
    return async (req, reply) => {
      try {
        const result = await neteaseApi({
          ...req.query,
          cookie: req.query.cookie,
        });
        return reply.send(result.body);
      } catch (error) {
        return reply.send(error);
      }
    };
  };
  Object.entries(NeteaseCloudMusicApi).forEach(
    ([nameInSnakeCase, neteaseApi]) => {
      if (['serveNcmApi', 'getModulesDefinitions'].includes(nameInSnakeCase))
        return;
      const name = pathCase(nameInSnakeCase);
      const handler = getHandler(neteaseApi);
      fastify.get(`/netease/${name}`, handler);
      fastify.post(`/netease/${name}`, handler);
    }
  );
  fastify.get('/netease', () => 'NeteaseCloudMusicApi');
}

export default netease;
