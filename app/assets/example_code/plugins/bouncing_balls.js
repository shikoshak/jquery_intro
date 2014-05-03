/** Example:  bouncing-balls **/

"use strict";

$.fn.sej_framed_animation = function (config) {

  function animate_frame(ballfield, frame_number, frame_duration, skipped_frames) {
    if (config.debug_log) {
      console.log("Doing Animation :" + frame_number + " dT:" + frame_duration + " skipped:" + skipped_frames);
    }
    return config.frame_callback(config, ballfield, frame_number, frame_duration, skipped_frames);
  }

  function stop_animation(ballfield, config) {
    if (config.debug_log) {
      console.log("Ending animation :" + ballfield.data('running'));
    }
    ballfield.data('running', false);

    if (config.on_complete_callback) {
      if (config.debug_log) {
        console.log("Calling on_complete_callback");
      }
      config.on_complete_callback(config, ballfield);
    }
  }

  function update_status_div(ballfield, config, frame_number, total_skipped) {
    if (config.status_div && config.status_update_frame_count) {
      if (frame_number == 1 || (frame_number % config.status_update_frame_count) == 0) {
        config.status_div.html("<span>Frame #" + frame_number + " <sup>(" + total_skipped + " skipped)</sup></span>");
      }
    }
  }

  function setup_callbacks(ballfield, config) {

    ballfield.on("sej_framed_animation.next", function (event, seq, frame_number, last_frame_time, frame_duration, skipped) {
      var me = $(event.target);

      if (config.max_frame_count > 0 && frame_number > config.max_frame_count) {
        stop_animation(ballfield, config);
      }

      if (me.data('running') == seq) {
        var current_ms = (new Date()).getTime();

        me.data('frame_number', frame_number);
        var total_skipped = parseInt(me.data('skipped_frames')) + skipped;
        me.data('skipped_frames', total_skipped);

        if (animate_frame(ballfield, frame_number, current_ms - last_frame_time, skipped)) {

          var used_ms = (new Date()).getTime() - current_ms;

          var next_scheduled = frame_duration - used_ms;

          var skip_frames = 0;

          if (next_scheduled < 0) {
            var blank_time = -next_scheduled;
            skip_frames = Math.floor((blank_time) / frame_duration);
            var remainder_used_ms = blank_time % frame_duration;


            frame_number += skip_frames;
            next_scheduled = frame_duration + (frame_duration - remainder_used_ms);
          }
          else {
            update_status_div(ballfield, config, frame_number, total_skipped);
          }


          // Always takes a few ms to schedule the event
          next_scheduled -= 2;

          var next_frame_number = frame_number + 1;

          if (config.debug_log) {
            console.log("Rescheduling frame " + next_frame_number + " for " + seq + " in:" + next_scheduled);
          }
          setTimeout(function () {
            me.trigger("sej_framed_animation.next", [seq, next_frame_number, current_ms, frame_duration, skip_frames]);
          }, next_scheduled);
        }
        else {
          stop_animation(ballfield, config);
        }
      } else {
        if (config.debug_log) {
          console.log("Exiting animation :" + seq + " (" + me.data('running') + ") frame: " + frame_number);
        }
      }
    });
  }

  function start_animation(ballfield, config) {
    if (ballfield.data('running')) {
      stop_animation(ballfield, config);
    }
    var sequence = Math.floor(Math.random() * 10000);
    ballfield.data('running', sequence);
    ballfield.data('skipped_frames', 0);
    ballfield.data('frame_number', 0);

    var current_ms = (new Date()).getTime();

    if (config.debug_log) {
      console.log("Starting animation " + sequence + " at " + current_ms);
    }
    ballfield.trigger("sej_framed_animation.next", [sequence, 1, current_ms, config.frame_duration, 0]);
  }

  var ballfield = this;

  config.initialize(ballfield, config);

  setup_callbacks(ballfield, config);

  config.restart = function () {
    start_animation(ballfield, config)
  };

  if (config.auto_start) {
    config.restart();
  }

};

$(document).ready(
  function () {

    function setup_balls(ballfield, config) {
      ballfield.css({position: 'relative', display: 'none'});
      ballfield.data('running', false);
      var inWidth = ballfield.innerWidth();
      var inHeight = ballfield.innerHeight();

      for (var i = 0; i < config.ball_count; i++) {
        var top = Math.random() * (inHeight - 20);
        var left = Math.random() * (inWidth - 20);
        var ball = $('<div></div>');

        ball.addClass("ball active");
        ball.data('bounce_factor', "0.9");
        ball.css({
            'borderColor': 'plum',
            'top': '' + top + 'px',
            'left': '' + left + 'px'
          }
        );

        ball.appendTo(ballfield);
      }

      ballfield.css({display: 'block'});
    }

    function floatDataWithDefault(jq, key, def_value) {
      var value = parseFloat(jq.data(key));
      if (isNaN(value)) {
        value = def_value;
        jq.data(key, value)
      }
      return value;
    }

    function isAtVerticalRest(current_y, max_y, delta_y) {
      if (Math.abs(delta_y) < 0.51) {
        var proximity = Math.abs(Math.round(current_y) - Math.round(max_y));
        return (proximity < 0.51);
      }
      return false;
    }

    function calcNextLeftPos(config, ball, inWidth, inHeight) {
      var delta_x = floatDataWithDefault(ball, 'delta_x', 0);
      var delta_y = floatDataWithDefault(ball, 'delta_y', 0);
      var myWidth = floatDataWithDefault(ball, 'width_cache', ball.outerWidth());
      var myHeight = floatDataWithDefault(ball, 'height_cache', ball.outerHeight());
      var current_x = parseFloat(ball.css('left'));
      var new_x = current_x;

      if (Math.abs(delta_x) > 0.3) {
        var bounce_factor = floatDataWithDefault(ball, 'bounce_factor', 0.9);

        var max_x = (inWidth - myWidth);
        var min_x = 0;
        if (isNaN(current_x)) {
          current_x = 0;
        }


        var current_y = parseFloat(ball.css('top'));
        var max_y = (inHeight - myHeight);
        var friction = isAtVerticalRest(current_y, max_y, delta_y) ? 0.001 : 0.0001;

        var delta_delta_x = delta_x > 0 ? -friction : friction;
        delta_x = delta_x + delta_delta_x;

        new_x = current_x + delta_x;

        if (new_x > max_x) {
          new_x = max_x - (new_x - max_x);
          if (new_x > max_x) {
            new_x = max_x;
          }

          delta_x = -(Math.abs(delta_x) * bounce_factor);
          ball.data('delta_x', delta_x);
        }
        else {
          if (new_x < min_x) {
            new_x = (min_x - new_x);
            if (new_x < min_x) {
              new_x = min_x;
            }

            delta_x = (Math.abs(delta_x) * bounce_factor);
            ball.data('delta_x', delta_x);
          }
        }
        ball.data('delta_x', delta_x);
      }
      else {
        ball.data('delta_x', "0");
      }


      return new_x;
    }

    function calcNextTopPos(config, ball, inWidth, inHeight) {
      var delta_y = floatDataWithDefault(ball, 'delta_y', 0);
      var current_y = parseFloat(ball.css('top'));
      //var myWidth = floatDataWithDefault(ball, 'width_cache',  ball.outerWidth());
      var myHeight = floatDataWithDefault(ball, 'height_cache', ball.outerHeight());

      var new_y = current_y;
      var max_y = (inHeight - myHeight);

      if (!isAtVerticalRest(current_y, max_y, delta_y)) {
        var bounce_factor = floatDataWithDefault(ball, 'bounce_factor', 0.9);
        var min_y = 0;
        if (isNaN(current_y)) {
          current_y = 0;
        }

        var gravity = 0.05;

        delta_y += gravity;

        new_y = current_y + delta_y;

        if (new_y > max_y) {
          new_y = max_y - (new_y - max_y);

          if (new_y > max_y) {
            new_y = max_y;
          }

          delta_y = -(Math.abs(delta_y) * bounce_factor);
        }
        else {
          if (new_y < min_y) {
            new_y = min_y - new_y;

            if (new_y < min_y) {
              new_y = min_y;
            }

            delta_y = (Math.abs(delta_y));
          }
        }
        ball.data('delta_y', delta_y);
        // ball.html(delta_y);
      }
      else {
        ball.data('delta_y', "0");
      }

      return new_y;
    }

    function explode_balls(config, ballfield) {
      var balls = ballfield.find('.ball');

      if (balls.length > 0) {
        balls.each(function () {
          var me = $(this);
          me.css({
            position: 'absolute'
          });
          me.data('delta_x', (Math.random() > 0.5 ? -1 : 1) * ((Math.random() * 5) + 10));
          me.data('delta_y', (Math.random() > 0.5 ? -1 : 1) * ((Math.random() * 5) + 10));
          me.addClass("active").removeClass('inactive');
        });
        config.restart();
      }
    }


    function move_balls(config, playingField, frame_number, frame_duration, skipped_frames) {

      var inWidth = playingField.innerWidth();
      var inHeight = playingField.innerHeight();

      var all_balls = playingField.find('.ball');

      var active_balls = all_balls.filter('.active');

      if (active_balls.length > 0) {

        active_balls.each(function () {
          var ball = $(this);

          var newLeft = calcNextLeftPos(config, ball, inWidth, inHeight);
          var newTop = calcNextTopPos(config, ball, inWidth, inHeight);

          if (ball.data('delta_x') == "0" && ball.data('delta_y') == "0") {
            ball.removeClass('active');
            ball.addClass('inactive');
          }
          else {
            ball.css({
              left: '' + newLeft + 'px',
              top: '' + newTop + 'px'
            });
          }
        });
        return true;
      }

      return false;
    }

    var config = {
      auto_start: true,
      frame_duration: 50,
      max_frame_count: -1,
      ball_count: 1,
      initialize: setup_balls,
      frame_callback: move_balls,
      on_complete_callback: explode_balls,
      status_div: $('#field_status'),
      status_update_frame_count: 10,
      debug_log: false
    };

    $('.playingfield').sej_framed_animation(config);

  }// document ready callback
)
;// document ready


