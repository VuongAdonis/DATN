import os

from ament_index_python.packages import get_package_share_directory

from launch import LaunchDescription
from launch_ros.actions import Node

import xacro


def generate_launch_description():
    joy_params = os.path.join(get_package_share_directory('my_bot'), 'config', 'joystick.yaml')

    joy_node = Node(
        package='joy',
        executable='joy_node',
        parameters=[joy_params],
    )

    teleop_node = Node(
        package='teleop_twist_joy',
        executable='teleop_node',
        name='teleop_node',
        parameters=[joy_params],
        # remappings=[('/cmd_vel', '/diff_cont/cmd_vel_unstamped')]
    )

    # twist_stamper = Node(
    #     package='twist_stamper',
    #     executable='twist_stamper',
    #     remappings=[('/cmd_vel_in', '/diff_cont/cmd_vel_unstamped'),
    #                 ('/cmd_vel_out', '/diff_cont/cmd_vel')]
    # )

    return LaunchDescription([
        joy_node,
        teleop_node,
        # twist_stamper
    ])