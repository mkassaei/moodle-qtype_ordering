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
        // Gradingtype is set to GRADING_RELATIVE_ALL_PREVIOUS_AND_NEXT by default in helper.php
        $question->start_attempt(new question_attempt_pending_step(), 1);

        $this->assertEquals([1, question_state::$gradedright],
                $question->grade_response($this->get_response($question, ['Modular', 'Object', 'Oriented', 'Dynamic', 'Learning', 'Environment'])));

        $this->assertGreaterThan([0, question_state::$gradedpartial],
                $question->grade_response($this->get_response($question, ['Oriented', 'Object', 'Dynamic', 'Learning', 'Environment', 'Modular'])));
        $this->assertLessThan([1, question_state::$gradedpartial],
                $question->grade_response($this->get_response($question, ['Oriented', 'Object', 'Dynamic', 'Learning', 'Environment', 'Modular'])));

        $this->assertEquals([0., question_state::$gradedwrong],
                $question->grade_response($this->get_response($question, ['Environment', 'Learning', 'Dynamic', 'Oriented', 'Object', 'Modular'])));

        $this->assertLessThan([1, question_state::$gradedpartial],
                $question->grade_response($this->get_response($question, ['Oriented', 'Environment', 'Modular', 'Learning', 'Object', 'Dynamic'])));
        $this->assertGreaterThan([0, question_state::$gradedpartial],
                $question->grade_response($this->get_response($question, ['Oriented', 'Environment', 'Modular', 'Learning', 'Object', 'Dynamic'])));

        // Set grading type to 'all or nothing'.
        $question->options->gradingtype = qtype_ordering_question::GRADING_ALL_OR_NOTHING;
        $this->assertEquals([1, question_state::$gradedright],
                $question->grade_response($this->get_response($question, ['Modular', 'Object', 'Oriented', 'Dynamic', 'Learning', 'Environment'])));
        $this->assertEquals([0., question_state::$gradedwrong],
                $question->grade_response($this->get_response($question, ['Environment', 'Learning', 'Dynamic', 'Oriented', 'Object', 'Modular'])));
        $this->assertEquals([0, question_state::$gradedwrong],
                $question->grade_response($this->get_response($question, ['Oriented', 'Object', 'Dynamic', 'Learning', 'Environment', 'Modular'])));

        // Set grading type to 'absolute position'.
        $question->options->gradingtype = qtype_ordering_question::GRADING_ABSOLUTE_POSITION;
        // Every item is in the correct position.
        $this->assertEquals([1, question_state::$gradedright],
                $question->grade_response($this->get_response($question, ['Modular', 'Object', 'Oriented', 'Dynamic', 'Learning', 'Environment'])));
        // None of the items are in the correct position.
        $this->assertEquals([0., question_state::$gradedwrong],
                $question->grade_response($this->get_response($question, ['Environment', 'Learning', 'Dynamic', 'Oriented', 'Object', 'Modular'])));
        // 4 out of 6 items are in the correct position.
        $this->assertLessThan([0.67, question_state::$gradedpartial],
                $question->grade_response($this->get_response($question, ['Environment','Object', 'Oriented',  'Dynamic', 'Learning', 'Modular'])));
        $this->assertGreaterThan([0.66, question_state::$gradedpartial],
                $question->grade_response($this->get_response($question, ['Environment','Object', 'Oriented',  'Dynamic', 'Learning', 'Modular'])));
        // 1 out of 6 item is in the correct position.
        $this->assertLessThan([0.17, question_state::$gradedpartial],
                $question->grade_response($this->get_response($question, ['Oriented', 'Object', 'Dynamic', 'Learning', 'Environment', 'Modular'])));
        $this->assertGreaterThan([0.16, question_state::$gradedpartial],
                $question->grade_response($this->get_response($question, ['Oriented', 'Object', 'Dynamic', 'Learning', 'Environment', 'Modular'])));

        // Set grading type to 'relative next exclude last'.
        $question->options->gradingtype = qtype_ordering_question::GRADING_RELATIVE_NEXT_EXCLUDE_LAST;
        // Every item is in the correct position.
        $this->assertEquals([1, question_state::$gradedright],
                $question->grade_response($this->get_response($question, ['Modular', 'Object', 'Oriented', 'Dynamic', 'Learning', 'Environment'])));
        // None of the items are in the correct position and there is not relative next.
        $this->assertEquals([0., question_state::$gradedwrong],
                $question->grade_response($this->get_response($question, ['Environment', 'Learning', 'Dynamic', 'Oriented', 'Object', 'Modular'])));
        // 4 out of 6 items are in the correct position with relative next
        $this->assertEquals([0.6, question_state::$gradedpartial],
                $question->grade_response($this->get_response($question, ['Environment','Object', 'Oriented',  'Dynamic', 'Learning', 'Modular'])));
        // 2 out of 6 item are in the correct position with relative next.
        $this->assertEquals([0.4, question_state::$gradedpartial],
                $question->grade_response($this->get_response($question, ['Oriented', 'Object', 'Dynamic', 'Learning', 'Environment', 'Modular'])));

        // Set grading type to 'relative next include last'.
        $question->options->gradingtype = qtype_ordering_question::GRADING_RELATIVE_NEXT_INCLUDE_LAST;
        // Every item is in the correct position.
        $this->assertEquals([1, question_state::$gradedright],
                $question->grade_response($this->get_response($question, ['Modular', 'Object', 'Oriented', 'Dynamic', 'Learning', 'Environment'])));
        // None of the items are in the correct position and there is not relative next.
        $this->assertEquals([0., question_state::$gradedwrong],
                $question->grade_response($this->get_response($question, ['Environment', 'Learning', 'Dynamic', 'Oriented', 'Object', 'Modular'])));
        // 3 out of 6 items are in the correct position with relative next
        $this->assertEquals([0.5, question_state::$gradedpartial],
                $question->grade_response($this->get_response($question, ['Environment','Object', 'Oriented',  'Dynamic', 'Learning', 'Modular'])));

        // Set grading type to 'relative one previous and next'.
        $question->options->gradingtype = qtype_ordering_question::GRADING_RELATIVE_ONE_PREVIOUS_AND_NEXT;
        // All items are in the correct position.
        $this->assertEquals([1, question_state::$gradedright],
                        $question->grade_response($this->get_response($question, ['Modular', 'Object', 'Oriented', 'Dynamic', 'Learning', 'Environment'])));
        // None of the items are in the correct position.
        $this->assertEquals([0., question_state::$gradedwrong],
                $question->grade_response($this->get_response($question, ['Environment', 'Learning', 'Dynamic', 'Oriented', 'Object', 'Modular'])));
        //
        $this->assertGreaterThan([0.33, question_state::$gradedpartial],
                $question->grade_response($this->get_response($question, ['Oriented', 'Object', 'Dynamic', 'Learning', 'Environment', 'Modular'])));
        $this->assertLessThan([0.34, question_state::$gradedpartial],
                $question->grade_response($this->get_response($question, ['Oriented', 'Object', 'Dynamic', 'Learning', 'Environment', 'Modular'])));


        // Set grading type to 'relative all previous and next'.
        $question->options->gradingtype = qtype_ordering_question::GRADING_RELATIVE_ALL_PREVIOUS_AND_NEXT;
        // All items are in the correct position.
        $this->assertEquals([1, question_state::$gradedright],
                        $question->grade_response($this->get_response($question, ['Modular', 'Object', 'Oriented', 'Dynamic', 'Learning', 'Environment'])));
        // None of the items are in the correct position.
        $this->assertEquals([0., question_state::$gradedwrong],
                $question->grade_response($this->get_response($question, ['Environment', 'Learning', 'Dynamic', 'Oriented', 'Object', 'Modular'])));
        //
        $this->assertEquals([0.6, question_state::$gradedpartial],
                $question->grade_response($this->get_response($question, ['Oriented', 'Object', 'Dynamic', 'Learning', 'Environment', 'Modular'])));
        $this->assertLessThan([0.7, question_state::$gradedpartial],
                $question->grade_response($this->get_response($question, ['Object', 'Oriented', 'Dynamic', 'Learning', 'Environment', 'Modular'])));
        $this->assertGreaterThan([0.6, question_state::$gradedpartial],
                $question->grade_response($this->get_response($question, ['Object', 'Oriented', 'Dynamic', 'Learning', 'Environment', 'Modular'])));

        // Set grading type to 'relative all previous and next'.
        $question->options->gradingtype = qtype_ordering_question::GRADING_LONGEST_ORDERED_SUBSET;
        // All items are in the correct position.
        $this->assertEquals([1, question_state::$gradedright],
                $question->grade_response($this->get_response($question, ['Modular', 'Object', 'Oriented', 'Dynamic', 'Learning', 'Environment'])));
        // None of the items are in the correct position.
        $this->assertEquals([0., question_state::$gradedwrong],
                $question->grade_response($this->get_response($question, ['Environment', 'Learning', 'Dynamic', 'Oriented', 'Object', 'Modular'])));
        // 5 items make the longest ordered subset and the result is 5 out of 5 (0.8333333333....)
        $this->assertLessThan([0.84, question_state::$gradedpartial],
                $question->grade_response($this->get_response($question, ['Object', 'Oriented', 'Dynamic', 'Learning', 'Environment', 'Modular'])));
        $this->assertGreaterThan([0.8, question_state::$gradedpartial],
                $question->grade_response($this->get_response($question, ['Object', 'Oriented', 'Dynamic', 'Learning', 'Environment', 'Modular'])));


        // Set grading type to 'relative all previous and next'.
        $question->options->gradingtype = qtype_ordering_question::GRADING_LONGEST_CONTIGUOUS_SUBSET;
        // All items are in the correct position.
        $this->assertEquals([1, question_state::$gradedright],
                $question->grade_response($this->get_response($question, ['Modular', 'Object', 'Oriented', 'Dynamic', 'Learning', 'Environment'])));
        // None of the items are in the correct position.
        $this->assertEquals([0., question_state::$gradedwrong],
                $question->grade_response($this->get_response($question, ['Environment', 'Learning', 'Dynamic', 'Oriented', 'Object', 'Modular'])));
        // 5 items make the longest ordered subset and the result is 5 out of 5 (0.8333333333....)
        $this->assertLessThan([0.84, question_state::$gradedpartial],
                $question->grade_response($this->get_response($question, ['Object', 'Oriented', 'Dynamic', 'Learning', 'Environment', 'Modular'])));
        $this->assertGreaterThan([0.8, question_state::$gradedpartial],
                $question->grade_response($this->get_response($question, ['Object', 'Oriented', 'Dynamic', 'Learning', 'Environment', 'Modular'])));

        // Set grading type to 'relative all previous and next'.
        $question->options->gradingtype = qtype_ordering_question::GRADING_RELATIVE_TO_CORRECT;
        // All items are in the correct position.
        $this->assertEquals([1, question_state::$gradedright],
                $question->grade_response($this->get_response($question, ['Modular', 'Object', 'Oriented', 'Dynamic', 'Learning', 'Environment'])));
        // None of the items are in the correct position.
        // TODO: This grading method is very generous. It has to be chnaged.
        $this->assertEquals([0.4, question_state::$gradedpartial],
                $question->grade_response($this->get_response($question, ['Environment', 'Learning', 'Dynamic', 'Oriented', 'Object', 'Modular'])));
        //
        $this->assertLessThan([0.7, question_state::$gradedpartial],
                $question->grade_response($this->get_response($question, ['Object', 'Oriented', 'Dynamic', 'Learning', 'Environment', 'Modular'])));
        $this->assertGreaterThan([0.6, question_state::$gradedpartial],
                $question->grade_response($this->get_response($question, ['Object', 'Oriented', 'Dynamic', 'Learning', 'Environment', 'Modular'])));
    }
}
