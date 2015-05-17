'use strict';

var express = require('express');
var controller = require('./post.controller.js');

var router = express.Router();

router.get('/', controller.index);
router.get('/:id', controller.show);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.patch('/:id', controller.update);
router.delete('/:id', controller.destroy);
router.put('/:id/upvote', controller.upvote);

module.exports = router;
/*/api/providers/:providerId/posts/:postId/comments/*/
