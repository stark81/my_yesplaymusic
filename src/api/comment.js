import request from '@/utils/request';

export function getSongNewComment(
  id,
  type,
  pageNo,
  pageSize,
  sortType,
  cursor
) {
  return request({
    url: '/comment/new',
    method: 'post',
    params: {
      id,
      type,
      pageNo,
      pageSize,
      sortType,
      cursor,
    },
  });
}

export function handlCommentLiked(id, cid, t, type) {
  return request({
    url: '/comment/like',
    method: 'post',
    params: {
      id,
      cid,
      t,
      type,
    },
  });
}

export function handleSubmitComment(t, type, id, content, commentId) {
  return request({
    url: '/comment',
    method: 'post',
    params: {
      t,
      type,
      id,
      content,
      commentId,
    },
  });
}

export function getFloorComment(parentCommentId, id, type, limit, time) {
  return request({
    url: '/comment/floor',
    method: 'post',
    params: {
      parentCommentId,
      id,
      type,
      limit,
      time,
    },
  });
}
