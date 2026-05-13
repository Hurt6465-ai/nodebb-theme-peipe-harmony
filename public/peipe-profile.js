(function () {
  'use strict';

  if (window.__peipeProfileThemeV2) return;
  window.__peipeProfileThemeV2 = true;

  var state = { root: null, user: null, comments: [], viewerComment: null, averageRating: 0, ratingCount: 0, currentRating: 5 };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function rel(path) {
    var base = (window.config && window.config.relative_path) || '';
    if (!path) return base || '';
    if (/^https?:\/\//i.test(path)) return path;
    if (base && path.indexOf(base + '/') === 0) return path;
    return base + path;
  }
  function csrfToken() {
    return (window.config && (window.config.csrf_token || window.config.csrfToken)) ||
      (document.querySelector('meta[name="csrf-token"]') && document.querySelector('meta[name="csrf-token"]').getAttribute('content')) || '';
  }
  function escapeHtml(input) {
    return String(input || '').replace(/[&<>'"]/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[ch];
    });
  }
  function norm(v) { return String(v || '').replace(/\s+/g, ' ').trim(); }
  function currentUid() { return Number(window.app && app.user && app.user.uid || 0); }
  function showError(msg) { if (window.app && app.alertError) app.alertError(msg); else alert(msg); }
  function showSuccess(msg) { if (window.app && app.alertSuccess) app.alertSuccess(msg); }

  function apiFetch(url, options) {
    options = options || {};
    options.credentials = options.credentials || 'same-origin';
    options.headers = Object.assign({ accept: 'application/json', 'x-requested-with': 'XMLHttpRequest' }, options.headers || {});
    return fetch(rel(url), options).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (json) {
        if (!res.ok) {
          var msg = json.error || json.message || (json.status && json.status.message) || ('HTTP ' + res.status);
          throw new Error(msg);
        }
        return json.response || json;
      });
    });
  }

  function getSlugFromPath() {
    var m = location.pathname.match(/\/user\/([^\/?#]+)/i);
    return m ? decodeURIComponent(m[1]) : '';
  }
  function avatarUrl(user) { return (user && (user.picture || user.uploadedpicture || user.avatar)) || ''; }
  function renderStars(value, editable) {
    value = Math.max(0, Math.min(5, Number(value || 0)));
    var html = '<div class="peipe-stars' + (editable ? ' is-editable' : '') + '">';
    for (var i = 1; i <= 5; i += 1) {
      html += '<button type="button" class="peipe-star' + (i <= value ? ' active' : '') + '" data-rating="' + i + '"' + (editable ? '' : ' disabled') + '>★</button>';
    }
    return html + '</div>';
  }
  function genderText(user) {
    var g = String(user && (user.gender || user.peipe_partner_gender) || '').toLowerCase();
    if (g === 'male' || g === 'm' || g === '男') return '<span class="male">♂</span>';
    if (g === 'female' || g === 'f' || g === '女') return '<span class="female">♀</span>';
    return '';
  }
  function profileChips(user) {
    var chips = [];
    var gender = genderText(user); if (gender) chips.push(gender);
    var age = user && (user.age || user.peipe_partner_age); if (age) chips.push(escapeHtml(age + '岁'));
    var country = user && (user.country || user.location || user.language_flag || user.peipe_partner_country); if (country) chips.push(escapeHtml(country));
    return chips.map(function (x) { return '<span>' + x + '</span>'; }).join('');
  }
  function profileStats(user) {
    return [['声望', user.reputation || 0], ['主题', user.topiccount || 0], ['帖子', user.postcount || 0], ['粉丝', user.followerCount || user.followers || 0]].map(function (item) {
      return '<div class="peipe-profile-stat"><b>' + escapeHtml(item[1]) + '</b><span>' + escapeHtml(item[0]) + '</span></div>';
    }).join('');
  }
  function commentItem(item) {
    var avatar = item.authorAvatar || item.picture || '';
    var name = item.authorName || item.username || '用户';
    return '<article class="peipe-comment-item" data-id="' + escapeHtml(item.id || '') + '">' +
      '<div class="peipe-comment-avatar">' + (avatar ? '<img src="' + escapeHtml(avatar) + '" alt="">' : '') + '</div>' +
      '<div class="peipe-comment-body"><div class="peipe-comment-head"><b>' + escapeHtml(name) + '</b>' + renderStars(Number(item.rating || 0), false) + '</div>' +
      '<p>' + escapeHtml(item.content || '') + '</p></div></article>';
  }
  function renderComments() {
    var box = $('.peipe-comments-list', state.root); if (!box) return;
    box.innerHTML = state.comments.length ? state.comments.map(commentItem).join('') : '<div class="peipe-empty-comments">还没有评价。</div>';
  }
  function renderComposer() {
    var targetUid = Number(state.user && state.user.uid || 0);
    var me = currentUid();
    if (!me) return '<div class="peipe-own-profile-note">登录后可以给 TA 打分评价。</div>';
    if (!targetUid || me === targetUid) return '<div class="peipe-own-profile-note">这是你的主页，下面会显示别人给你的评价。</div>';
    var old = state.viewerComment || {};
    var rating = Number(old.rating || state.currentRating || 5);
    return '<section class="peipe-comment-compose"><div class="peipe-compose-title">给 TA 评价</div>' + renderStars(rating, true) +
      '<textarea class="peipe-comment-input" maxlength="120" placeholder="写一句真实印象，例如：很有耐心，适合练口语。">' + escapeHtml(old.content || '') + '</textarea>' +
      '<button type="button" class="peipe-comment-submit">' + (old.id ? '更新评价' : '发布评价') + '</button></section>';
  }
  function render() {
    var user = state.user || {};
    var avatar = avatarUrl(user);
    var slug = user.userslug || getSlugFromPath();
    var about = norm(user.aboutme || user.bio || user.signature || state.root.getAttribute('data-about') || '');
    state.root.innerHTML = '<div class="peipe-profile-shell">' +
      '<section class="peipe-profile-hero"><div class="peipe-profile-cover"></div><div class="peipe-profile-main">' +
      '<div class="peipe-profile-avatar">' + (avatar ? '<img src="' + escapeHtml(avatar) + '" alt="">' : '') + '</div>' +
      '<div class="peipe-profile-info"><h1>' + escapeHtml(user.displayname || user.username || state.root.getAttribute('data-username') || '用户') + '</h1>' +
      '<div class="peipe-profile-slug">@' + escapeHtml(slug) + '</div><div class="peipe-profile-chips">' + profileChips(user) + '</div></div></div>' +
      '<div class="peipe-profile-stats">' + profileStats(user) + '</div><p class="peipe-profile-about">' + escapeHtml(about || '这个人还没有填写介绍。') + '</p></section>' +
      '<nav class="peipe-profile-tabs"><button class="active" data-tab="comments">评价</button><a href="' + rel('/user/' + encodeURIComponent(slug) + '/topics') + '">动态</a><a href="' + rel('/user/' + encodeURIComponent(slug) + '/about') + '">资料</a></nav>' +
      '<section class="peipe-rating-summary"><div class="peipe-rating-number">' + Number(state.averageRating || 0).toFixed(1) + '</div><div class="peipe-rating-side">' + renderStars(Math.round(state.averageRating || 0), false) + '<span>' + Number(state.ratingCount || 0) + ' 人评分</span></div></section>' +
      renderComposer() + '<section class="peipe-comments-list"></section></div>';
    renderComments(); bindComposer();
  }
  function bindComposer() {
    $$('.peipe-comment-compose .peipe-star', state.root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.currentRating = Number(btn.getAttribute('data-rating') || 5);
        var wrap = btn.closest('.peipe-stars');
        $$('.peipe-star', wrap).forEach(function (star) { star.classList.toggle('active', Number(star.getAttribute('data-rating') || 0) <= state.currentRating); });
      });
    });
    var submit = $('.peipe-comment-submit', state.root); if (!submit) return;
    submit.addEventListener('click', function () {
      var targetUid = Number(state.user && state.user.uid || 0);
      var input = $('.peipe-comment-input', state.root);
      var content = norm(input && input.value);
      var rating = Math.max(1, Math.min(5, Number(state.currentRating || 5)));
      if (!content) return showError('请写一句评价');
      submit.disabled = true; submit.textContent = '提交中...';
      apiFetch('/api/peipe-partners/profile/' + encodeURIComponent(targetUid) + '/comments', {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8', 'x-csrf-token': csrfToken() },
        body: JSON.stringify({ rating: rating, content: content })
      }).then(function () { showSuccess('评价已保存'); return loadComments(); }).catch(function (err) { showError(err.message || '评价失败'); }).finally(function () { submit.disabled = false; });
    });
  }
  function loadUser() {
    var uid = Number(state.root.getAttribute('data-uid') || 0);
    var slug = state.root.getAttribute('data-userslug') || getSlugFromPath();
    state.user = { uid: uid, userslug: slug, username: state.root.getAttribute('data-username') || slug, picture: state.root.getAttribute('data-picture') || '' };
    return apiFetch('/api/user/' + encodeURIComponent(slug)).then(function (json) { state.user = json.user || json; return state.user; }).catch(function () { return state.user; });
  }
  function loadComments() {
    var uid = Number(state.user && state.user.uid || 0);
    if (!uid) { render(); return Promise.resolve(); }
    return apiFetch('/api/peipe-partners/profile/' + encodeURIComponent(uid) + '/comments?limit=50').then(function (json) {
      state.comments = json.comments || [];
      state.viewerComment = json.viewerComment || null;
      state.averageRating = Number(json.averageRating || 0);
      state.ratingCount = Number(json.ratingCount || 0);
      if (state.viewerComment && state.viewerComment.rating) state.currentRating = Number(state.viewerComment.rating || 5);
      render();
    }).catch(function () { state.comments = []; state.viewerComment = null; state.averageRating = 0; state.ratingCount = 0; render(); });
  }
  function init() {
    var root = document.getElementById('peipe-profile-app');
    if (!root) { document.body.classList.remove('peipe-profile-mode'); return; }
    state.root = root;
    document.body.classList.add('peipe-profile-mode');
    loadUser().then(loadComments);
  }
  window.addEventListener('action:ajaxify.start', function () { document.body.classList.remove('peipe-profile-mode'); });
  window.addEventListener('action:ajaxify.end', init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

