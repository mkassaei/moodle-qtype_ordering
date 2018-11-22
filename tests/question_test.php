<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.


/**
 * Unit tests for the ordering question definition class.
 *
 * @package    qtype_ordering
 * @copyright  2018 The Open University
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */


global $CFG;
require_once($CFG->dirroot . '/question/engine/tests/helpers.php');


/**
 * Unit tests for the ordering question definition class.
 *
 * @copyright 2018 The Open University
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class qtype_ordering_question_test extends advanced_testcase {

    /**
     * return an array of answer codes in the order of given response.
     * @param object $question the question object
     * @param array $items array of input items
     */
    private function get_response($question, $items) {
        $md5keys = [];
        foreach ($items as $item) {
            foreach ($question->answers as $answer) {
                if ($item === $answer->answer) {
                    $md5keys[] = $answer->md5key;
                    break;
                }
            }
        }
        return ['response_' . $question->id => implode(',', $md5keys)];
    }

    public function test_grading() {
        /** @var qtype_ordering_question $question */
        $question = test_question_maker::make_question('ordering');

        // Set grading type to 'grading all or nothing'.
        $question->options->gradingtype = qtype_ordering_question::GRADING_ALL_OR_NOTHING;
        $question->start_attempt(new question_attempt_pending_step(), 1);

        $this->assertEquals([1, question_state::$gradedright],
                $question->grade_response($this->get_response($question, ['Modular', 'Object', 'Oriented', 'Dynamic', 'Learning', 'Environment'])));

        $this->assertLessThan([1, question_state::$gradedpartial],
                $question->grade_response($this->get_response($question, ['Oriented', 'Object', 'Dynamic', 'Learning', 'Environment', 'Modular'])));

        $this->assertEquals([0, question_state::$gradedwrong],
                $question->grade_response($this->get_response($question, ['Environment', 'Learning', 'Dynamic', 'Oriented', 'Object', 'Modular'])));

        $this->assertEquals([0, question_state::$gradedwrong],
                $question->grade_response($this->get_response($question, ['Oriented', 'Environment', 'Modular', 'Learning', 'Object', 'Dynamic'])));

    }
}
