'use strict';

const express = require('express');

let router = express.Router();

router.get('/', function(req, res, next) {
  res.render('index', { title: '폴로랜더 프로-한글버전' });
});

module.exports.router= router;
