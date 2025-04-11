import { Pipe, PipeTransform } from '@angular/core';
import { Room } from '../services/roomApi';

@Pipe({
  name: 'roomsByBuilding',
  standalone: true,
})
export class RoomsByBuildingPipe implements PipeTransform {
  transform(rooms: Room[]): string[] {
    if (!rooms || !rooms.length) return [];

    // Extract unique building names
    const buildings = [...new Set(rooms.map((room) => room.buildingName))];

    // Sort alphabetically
    return buildings.sort();
  }
}

@Pipe({
  name: 'filterByBuilding',
  standalone: true,
})
export class FilterByBuildingPipe implements PipeTransform {
  transform(rooms: Room[], building: string): Room[] {
    if (!rooms || !rooms.length || !building) return [];

    return rooms
      .filter((room) => room.buildingName === building)
      .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));
  }
}
