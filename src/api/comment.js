import request from '@/utils/request';

export function getComment(params) {
  return request({
    url: '/comment/new',
    method: 'post',
    params,
  });
}

export function likeComment(params) {
  return request({
    url: '/comment/like',
    method: 'get',
    params,
  });
}

export function submitComment(params) {
  return request({
    url: '/comment',
    method: 'get',
    params,
  });
}

export function getFloorComment(params) {
  return request({
    url: '/comment/floor',
    method: 'get',
    params,
  });
}
